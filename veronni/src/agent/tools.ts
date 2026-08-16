import type Anthropic from "@anthropic-ai/sdk";
import {
  addToCart,
  describeCart,
  priceCart,
  removeFromCart,
  type CartLine,
  type DeliveryMode,
} from "../cart.js";
import { formatPrice } from "../money.js";
import { itemTitle, type MenuIndex } from "../menu.js";
import {
  createOrder as createOrderInDb,
  etaMinutes,
  validateOrder,
  type CustomerDraft,
  type OrderWithItems,
} from "../order.js";
import { config } from "../config.js";

export type AgentSession = {
  chatId: string;
  cart: CartLine[];
  customer: CustomerDraft;
  menu: MenuIndex;
  now: Date;
  /** Заполняется, когда заказ реально создан, — бот по этому полю шлёт талон на кухню. */
  placedOrder: OrderWithItems | null;
};

export type ToolDeps = {
  createOrder: typeof createOrderInDb;
};

export const defaultToolDeps: ToolDeps = { createOrder: createOrderInDb };

// Описания намеренно говорят «когда вызывать», а не «что делает»: модель
// выбирает инструмент по описанию, и «добавляет в корзину» ей ничего не
// сообщает о моменте вызова.
export const tools: Anthropic.Tool[] = [
  {
    name: "add_to_cart",
    description:
      "Добавить позиции в корзину. Вызывай сразу, как только клиент назвал, что хочет, и размер однозначен. Можно передать несколько позиций за раз — «две маргариты и колу» это один вызов. Возвращает содержимое корзины и сумму: называй клиенту именно эти числа.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Позиции для добавления",
          items: {
            type: "object",
            properties: {
              item_id: { type: "string", description: "id из меню, дословно" },
              quantity: { type: "integer", minimum: 1, description: "Сколько штук" },
            },
            required: ["item_id", "quantity"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "remove_from_cart",
    description:
      "Убрать позицию из корзины: клиент передумал, ошибся количеством или просит «убери колу». Без quantity убирает позицию целиком.",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "id из меню" },
        quantity: { type: "integer", minimum: 1, description: "Сколько штук убрать. Не указано — убрать все." },
      },
      required: ["item_id"],
    },
  },
  {
    name: "clear_cart",
    description: "Очистить корзину целиком. Только если клиент прямо просит начать заказ заново или отменяет всё.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "set_order_details",
    description:
      "Записать данные заказа. Вызывай сразу, как клиент назвал любое из них — по одному полю за раз это нормально. Не жди, пока соберутся все.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "Имя, как назвал клиент" },
        phone: { type: "string", description: "Телефон в том виде, как его продиктовали. Не переписывай цифры." },
        address: { type: "string", description: "Улица, дом, квартира, этаж, код домофона" },
        delivery_mode: {
          type: "string",
          enum: ["delivery", "pickup"],
          description: "delivery — доставка курьером, pickup — самовывоз",
        },
        note: { type: "string", description: "Пожелание к заказу: «без лука», «позвонить за 10 минут»" },
      },
    },
  },
  {
    name: "place_order",
    description:
      "Оформить заказ и отправить его на кухню. Вызывай ТОЛЬКО после того, как клиент подтвердил состав и сумму. Если чего-то не хватает, инструмент вернёт список — спроси у клиента недостающее и вызови снова. Возвращает номер заказа.",
    input_schema: { type: "object", properties: {} },
  },
];

export const toolNames = new Set(tools.map((tool) => tool.name));

function cartReply(session: AgentSession, prefix?: string): string {
  const priced = priceCart(session.cart, session.menu, session.customer.deliveryMode);
  const body = describeCart(priced, session.customer.deliveryMode);
  const notes: string[] = [];
  if (session.customer.deliveryMode === null && priced.subtotalGr > 0) {
    notes.push("Способ получения ещё не выбран, поэтому стоимость доставки не посчитана.");
  }
  if (
    session.customer.deliveryMode === "delivery" &&
    priced.subtotalGr > 0 &&
    priced.subtotalGr < config.delivery.minOrderGr
  ) {
    notes.push(`До минимальной суммы доставки не хватает ${formatPrice(config.delivery.minOrderGr - priced.subtotalGr)}.`);
  }
  return [prefix, body, ...notes].filter(Boolean).join("\n");
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

/**
 * Выполняет вызов инструмента и возвращает текст для tool_result.
 *
 * Никогда не бросает: любая проблема — это ответ, который модель должна
 * увидеть и обработать репликой клиенту. Исключение здесь оборвало бы диалог
 * на середине заказа.
 */
export async function executeTool(
  name: string,
  rawInput: unknown,
  session: AgentSession,
  deps: ToolDeps = defaultToolDeps
): Promise<string> {
  const input = asRecord(rawInput);
  try {
    switch (name) {
      case "add_to_cart":
        return addTool(input, session);
      case "remove_from_cart":
        return removeTool(input, session);
      case "clear_cart":
        session.cart = [];
        return "Корзина очищена.";
      case "set_order_details":
        return detailsTool(input, session);
      case "place_order":
        return await placeTool(session, deps);
      default:
        return `Инструмента «${name}» не существует.`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Не получилось: ${message}`;
  }
}

function addTool(input: Record<string, unknown>, session: AgentSession): string {
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) return "Не передано ни одной позиции.";

  const added: string[] = [];
  const unknown: string[] = [];

  for (const entry of rawItems) {
    const row = asRecord(entry);
    const itemId = typeof row.item_id === "string" ? row.item_id : "";
    const quantityRaw = row.quantity;
    const quantity =
      typeof quantityRaw === "number" && Number.isInteger(quantityRaw) && quantityRaw > 0
        ? quantityRaw
        : 1;

    const item = session.menu.get(itemId);
    if (!item || !item.available) {
      unknown.push(itemId || "(пусто)");
      continue;
    }
    session.cart = addToCart(session.cart, itemId, quantity);
    added.push(`${itemTitle(item)} × ${quantity}`);
  }

  const head: string[] = [];
  if (added.length > 0) head.push(`Добавлено: ${added.join(", ")}.`);
  if (unknown.length > 0) {
    head.push(
      `В меню нет таких id: ${unknown.join(", ")}. Не добавлено. Возьми id строго из меню или скажи клиенту, что этого блюда нет.`
    );
  }
  return cartReply(session, head.join(" "));
}

function removeTool(input: Record<string, unknown>, session: AgentSession): string {
  const itemId = typeof input.item_id === "string" ? input.item_id : "";
  const quantity =
    typeof input.quantity === "number" && Number.isInteger(input.quantity) && input.quantity > 0
      ? input.quantity
      : undefined;

  if (!session.cart.some((line) => line.itemId === itemId)) {
    return cartReply(session, `Позиции «${itemId}» в корзине нет.`);
  }
  session.cart = removeFromCart(session.cart, itemId, quantity);
  return cartReply(session, "Убрано.");
}

function detailsTool(input: Record<string, unknown>, session: AgentSession): string {
  const changed: string[] = [];

  const text = (key: string): string | null => {
    const value = input[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  };

  const name = text("customer_name");
  if (name) {
    session.customer.customerName = name;
    changed.push(`имя: ${name}`);
  }
  const phone = text("phone");
  if (phone) {
    session.customer.phone = phone;
    changed.push(`телефон: ${phone}`);
  }
  const address = text("address");
  if (address) {
    session.customer.address = address;
    changed.push(`адрес: ${address}`);
  }
  const note = text("note");
  if (note) {
    session.customer.note = note;
    changed.push(`комментарий: ${note}`);
  }
  const mode = input.delivery_mode;
  if (mode === "delivery" || mode === "pickup") {
    session.customer.deliveryMode = mode as DeliveryMode;
    changed.push(mode === "delivery" ? "способ: доставка" : "способ: самовывоз");
  }

  if (changed.length === 0) return "Ничего не передано — данные заказа не изменились.";
  return cartReply(session, `Записал — ${changed.join("; ")}.`);
}

async function placeTool(session: AgentSession, deps: ToolDeps): Promise<string> {
  if (session.placedOrder) {
    return `Заказ №${session.placedOrder.number} уже оформлен в этом разговоре. Новый заказ — только если клиент начнёт его заново.`;
  }

  const priced = priceCart(session.cart, session.menu, session.customer.deliveryMode);
  const problems = validateOrder(priced, session.customer, session.now);
  if (problems.length > 0) {
    return [
      "Заказ НЕ оформлен. Не хватает:",
      ...problems.map((problem) => `- ${problem.message}`),
      "Спроси у клиента недостающее и вызови place_order снова.",
    ].join("\n");
  }

  const order = await deps.createOrder({
    chatId: session.chatId,
    cart: priced,
    customer: session.customer,
  });
  session.placedOrder = order;
  session.cart = [];

  const mode = session.customer.deliveryMode === "delivery" ? "доставка" : "самовывоз";
  return [
    `Заказ №${order.number} оформлен и ушёл на кухню.`,
    `Способ: ${mode}. К оплате при получении: ${formatPrice(order.totalGr)}.`,
    `Готовность примерно через ${etaMinutes(session.customer.deliveryMode!)} минут.`,
    "Назови клиенту номер заказа и сумму. Больше place_order не вызывай.",
  ].join("\n");
}
