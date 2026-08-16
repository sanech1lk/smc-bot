import type Anthropic from "@anthropic-ai/sdk";
import type { MenuItem } from "@prisma/client";
import { indexMenu, type MenuIndex } from "../src/menu.js";
import { normalizePhone, type OrderWithItems } from "../src/order.js";
import type { PricedCart } from "../src/cart.js";
import type { CustomerDraft } from "../src/order.js";

const base = {
  description: "",
  size: null as string | null,
  vegetarian: false,
  spicy: false,
  available: true,
  sortOrder: 0,
};

export function makeMenuItems(): MenuItem[] {
  return [
    { ...base, id: "margherita-32", category: "pizza", name: "Margherita", size: "32 cm", priceGr: 3200, sortOrder: 0 },
    { ...base, id: "margherita-45", category: "pizza", name: "Margherita", size: "45 cm", priceGr: 5400, sortOrder: 1 },
    { ...base, id: "salami-32", category: "pizza", name: "Salami", size: "32 cm", priceGr: 3900, sortOrder: 2 },
    { ...base, id: "cola-05", category: "drink", name: "Coca-Cola", size: "0,5 l", priceGr: 900, sortOrder: 3 },
  ];
}

export function makeMenu(): MenuIndex {
  return indexMenu(makeMenuItems());
}

export function emptyCustomer(): CustomerDraft {
  return { customerName: null, phone: null, address: null, deliveryMode: null, note: null };
}

/** Час, когда кухня заведомо работает (11:00–22:00 в Europe/Warsaw). */
export const OPEN_TIME = new Date("2026-05-20T12:00:00Z");
export const CLOSED_TIME = new Date("2026-05-20T02:00:00Z");

let nextOrderNumber = 100;

/** Подменяет запись в базу: тесты проверяют логику заказа, а не Prisma. */
export function stubCreateOrder(sink?: { last?: OrderWithItems }) {
  return async (input: {
    chatId: string;
    cart: PricedCart;
    customer: CustomerDraft;
  }): Promise<OrderWithItems> => {
    const number = nextOrderNumber++;
    const order: OrderWithItems = {
      number,
      chatId: input.chatId,
      customerName: input.customer.customerName ?? "",
      // Как и настоящий createOrder: номер в базу попадает нормализованным.
      phone: normalizePhone(input.customer.phone ?? "") ?? "",
      deliveryMode: input.customer.deliveryMode ?? "pickup",
      address: input.customer.address,
      note: input.customer.note,
      subtotalGr: input.cart.subtotalGr,
      deliveryGr: input.cart.deliveryGr,
      totalGr: input.cart.totalGr,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: input.cart.lines.map((line, index) => ({
        id: `item-${number}-${index}`,
        orderNumber: number,
        itemId: line.itemId,
        nameSnapshot: line.title,
        priceGr: line.priceGr,
        quantity: line.quantity,
      })),
    };
    if (sink) sink.last = order;
    return order;
  };
}

// ── Заглушка модели ────────────────────────────────────────────────────────

export function textMessage(text: string): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    stop_details: null,
    container: null,
    usage: { input_tokens: 0, output_tokens: 0 } as Anthropic.Usage,
  };
}

export function toolMessage(
  calls: Array<{ name: string; input: unknown; id?: string }>,
  text?: string
): Anthropic.Message {
  const content: Anthropic.ContentBlock[] = [];
  if (text) content.push({ type: "text", text, citations: null });
  for (const [index, call] of calls.entries()) {
    content.push({
      type: "tool_use",
      id: call.id ?? `tool_${index}`,
      name: call.name,
      input: call.input,
    } as Anthropic.ToolUseBlock);
  }
  return { ...textMessage(""), content, stop_reason: "tool_use" };
}

export type RecordedCall = {
  params: Anthropic.MessageCreateParamsNonStreaming;
  toolResults: string[];
};

/**
 * Проигрывает заранее заданные ответы модели по очереди и запоминает, что
 * ей отдали в tool_result. Так проверяется именно цикл агента, без сети.
 */
export function scriptedLlm(script: Anthropic.Message[]) {
  const calls: RecordedCall[] = [];
  let index = 0;

  const call = async (
    params: Anthropic.MessageCreateParamsNonStreaming
  ): Promise<Anthropic.Message> => {
    const last = params.messages[params.messages.length - 1];
    const toolResults: string[] = [];
    if (last && last.role === "user" && Array.isArray(last.content)) {
      for (const block of last.content) {
        if (typeof block === "object" && block.type === "tool_result") {
          toolResults.push(typeof block.content === "string" ? block.content : "");
        }
      }
    }
    calls.push({ params, toolResults });
    const response = script[index];
    index += 1;
    if (!response) throw new Error(`Заглушка исчерпана: модель вызвана ${index} раз`);
    return response;
  };

  return { call, calls, used: () => index };
}
