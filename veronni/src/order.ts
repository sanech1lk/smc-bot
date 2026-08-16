import type { Order, OrderItem } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { formatPrice } from "./money.js";
import type { DeliveryMode, PricedCart } from "./cart.js";

export const ORDER_STATUSES = ["new", "cooking", "on_way", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusLabels: Record<OrderStatus, string> = {
  new: "Новый",
  cooking: "Готовится",
  on_way: "В пути",
  done: "Выдан",
  cancelled: "Отменён",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Приводит телефон к виду +48XXXXXXXXX.
 *
 * Клиент диктует номер как ему удобно — «123 456 789», «+48-123-456-789»,
 * «0048123456789». Курьеру нужен один формат, а модели нельзя доверить
 * нормализацию: она может «поправить» цифру.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;

  // 00 как международный префикс
  const withoutTrunk = trimmed.startsWith("00") ? digits.slice(2) : digits;

  if (!hasPlus && withoutTrunk.length === 9) return `+48${withoutTrunk}`;
  if (withoutTrunk.startsWith("48") && withoutTrunk.length === 11) return `+${withoutTrunk}`;
  if (hasPlus && withoutTrunk.length >= 8 && withoutTrunk.length <= 15) return `+${withoutTrunk}`;
  // 9 цифр — польский мобильный, даже если человек забыл про плюс
  if (withoutTrunk.length === 9) return `+48${withoutTrunk}`;
  return null;
}

/** Час по местному времени пиццерии, независимо от часового пояса сервера. */
export function localHour(now: Date, timeZone = config.restaurant.timeZone): number {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return Number(formatted);
}

export function isOpen(now: Date): boolean {
  const hour = localHour(now);
  const { opensAt, closesAt } = config.restaurant;
  // Кухня, работающая за полночь (например 11:00–02:00), даёт opensAt > closesAt.
  if (opensAt <= closesAt) return hour >= opensAt && hour < closesAt;
  return hour >= opensAt || hour < closesAt;
}

export type CustomerDraft = {
  customerName: string | null;
  phone: string | null;
  address: string | null;
  deliveryMode: DeliveryMode | null;
  note: string | null;
};

export type OrderProblem = { field: string; message: string };

/**
 * Всё, что мешает принять заказ. Проверки живут здесь, а не в промпте:
 * модель может забыть спросить адрес, код — нет.
 */
export function validateOrder(
  cart: PricedCart,
  customer: CustomerDraft,
  now: Date
): OrderProblem[] {
  const problems: OrderProblem[] = [];

  if (cart.unavailable.length > 0) {
    problems.push({
      field: "cart",
      message: `Этих позиций больше нет в меню: ${cart.unavailable.join(", ")}. Удалите их из корзины.`,
    });
  }
  if (cart.lines.length === 0) {
    problems.push({ field: "cart", message: "Корзина пуста — нечего заказывать." });
  }
  if (!customer.deliveryMode) {
    problems.push({ field: "delivery_mode", message: "Не выбрано: доставка или самовывоз." });
  }
  if (!customer.customerName || customer.customerName.trim().length < 2) {
    problems.push({ field: "customer_name", message: "Не указано имя клиента." });
  }
  if (!customer.phone) {
    problems.push({ field: "phone", message: "Не указан телефон." });
  } else if (!normalizePhone(customer.phone)) {
    problems.push({
      field: "phone",
      message: `Телефон «${customer.phone}» не похож на настоящий. Нужен польский номер из 9 цифр или международный с кодом страны.`,
    });
  }
  if (customer.deliveryMode === "delivery") {
    if (!customer.address || customer.address.trim().length < 5) {
      problems.push({
        field: "address",
        message: "Для доставки нужен адрес: улица, дом, квартира.",
      });
    }
    if (cart.subtotalGr > 0 && cart.subtotalGr < config.delivery.minOrderGr) {
      problems.push({
        field: "cart",
        message: `Минимальная сумма доставки — ${formatPrice(config.delivery.minOrderGr)}, сейчас ${formatPrice(cart.subtotalGr)}. Предложите добавить что-нибудь или забрать самовывозом.`,
      });
    }
  }
  if (!isOpen(now)) {
    problems.push({
      field: "hours",
      message: `Кухня сейчас закрыта. Работаем с ${config.restaurant.opensAt}:00 до ${config.restaurant.closesAt}:00.`,
    });
  }
  return problems;
}

export type OrderWithItems = Order & { items: OrderItem[] };

export async function createOrder(input: {
  chatId: string;
  cart: PricedCart;
  customer: CustomerDraft;
}): Promise<OrderWithItems> {
  const { chatId, cart, customer } = input;
  const phone = customer.phone ? normalizePhone(customer.phone) : null;
  if (!phone) throw new Error("createOrder вызван без валидного телефона");
  if (!customer.deliveryMode) throw new Error("createOrder вызван без способа получения");
  if (cart.lines.length === 0) throw new Error("createOrder вызван с пустой корзиной");

  return prisma.order.create({
    data: {
      chatId,
      customerName: (customer.customerName ?? "").trim(),
      phone,
      deliveryMode: customer.deliveryMode,
      address: customer.deliveryMode === "delivery" ? (customer.address ?? "").trim() : null,
      note: customer.note?.trim() || null,
      subtotalGr: cart.subtotalGr,
      deliveryGr: cart.deliveryGr,
      totalGr: cart.totalGr,
      status: "new",
      items: {
        create: cart.lines.map((line) => ({
          itemId: line.itemId,
          nameSnapshot: line.title,
          priceGr: line.priceGr,
          quantity: line.quantity,
        })),
      },
    },
    include: { items: true },
  });
}

export function etaMinutes(deliveryMode: DeliveryMode): number {
  return deliveryMode === "delivery"
    ? config.delivery.etaMinutes
    : config.delivery.pickupEtaMinutes;
}

/** Талон для кухни: сверху то, что нужно повару, внизу — курьеру. */
export function renderKitchenTicket(order: OrderWithItems): string {
  const lines = order.items.map((item) => `• ${item.nameSnapshot} × ${item.quantity}`);
  const head =
    order.deliveryMode === "delivery"
      ? `🛵 ЗАКАЗ №${order.number} — ДОСТАВКА`
      : `🏠 ЗАКАЗ №${order.number} — САМОВЫВОЗ`;

  const tail = [
    "",
    `Сумма блюд: ${formatPrice(order.subtotalGr)}`,
    order.deliveryGr > 0 ? `Доставка: ${formatPrice(order.deliveryGr)}` : null,
    `К оплате при получении: ${formatPrice(order.totalGr)}`,
    "",
    `${order.customerName}, ${order.phone}`,
    order.address ? `Адрес: ${order.address}` : null,
    order.note ? `Комментарий: ${order.note}` : null,
  ].filter((row): row is string => row !== null);

  return [head, "", ...lines, ...tail].join("\n");
}
