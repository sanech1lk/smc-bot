import { config } from "./config.js";
import { formatPrice, sumLines } from "./money.js";
import { itemTitle, type MenuIndex } from "./menu.js";

export type CartLine = { itemId: string; quantity: number };
export type DeliveryMode = "delivery" | "pickup";

export type PricedLine = {
  itemId: string;
  title: string;
  priceGr: number;
  quantity: number;
  lineTotalGr: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalGr: number;
  deliveryGr: number;
  totalGr: number;
  /** Позиции из корзины, которых больше нет в меню (сняли, пока клиент думал). */
  unavailable: string[];
};

/** Здравые пределы, чтобы опечатка «100 пицц» не уехала на кухню. */
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES = 30;

export function parseCart(raw: string): CartLine[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const lines: CartLine[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const { itemId, quantity } = entry as Record<string, unknown>;
    if (typeof itemId !== "string") continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) continue;
    lines.push({ itemId, quantity });
  }
  return lines;
}

export function serializeCart(lines: CartLine[]): string {
  return JSON.stringify(lines);
}

/**
 * Добавление с накоплением: два вызова «margherita ×1» дают одну строку ×2,
 * а не две одинаковые строки в чеке.
 */
export function addToCart(lines: CartLine[], itemId: string, quantity: number): CartLine[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Количество должно быть целым положительным, получено ${quantity}`);
  }
  const next = lines.map((line) => ({ ...line }));
  const existing = next.find((line) => line.itemId === itemId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_LINE);
    return next;
  }
  if (next.length >= MAX_LINES) {
    throw new Error(`В корзине уже ${MAX_LINES} разных позиций`);
  }
  next.push({ itemId, quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) });
  return next;
}

/** Без quantity убирает позицию целиком. */
export function removeFromCart(lines: CartLine[], itemId: string, quantity?: number): CartLine[] {
  if (quantity === undefined) return lines.filter((line) => line.itemId !== itemId);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Количество должно быть целым положительным, получено ${quantity}`);
  }
  const next: CartLine[] = [];
  for (const line of lines) {
    if (line.itemId !== itemId) {
      next.push({ ...line });
      continue;
    }
    const left = line.quantity - quantity;
    if (left > 0) next.push({ itemId: line.itemId, quantity: left });
  }
  return next;
}

/** Ровно эта функция — единственный источник итоговых сумм. Модель их не считает. */
export function priceCart(
  lines: CartLine[],
  menu: MenuIndex,
  deliveryMode: DeliveryMode | null
): PricedCart {
  const priced: PricedLine[] = [];
  const unavailable: string[] = [];

  for (const line of lines) {
    const item = menu.get(line.itemId);
    if (!item || !item.available) {
      unavailable.push(line.itemId);
      continue;
    }
    priced.push({
      itemId: item.id,
      title: itemTitle(item),
      priceGr: item.priceGr,
      quantity: line.quantity,
      lineTotalGr: item.priceGr * line.quantity,
    });
  }

  const subtotalGr = sumLines(priced);
  const deliveryGr = deliveryFee(subtotalGr, deliveryMode);
  return { lines: priced, subtotalGr, deliveryGr, totalGr: subtotalGr + deliveryGr, unavailable };
}

export function deliveryFee(subtotalGr: number, deliveryMode: DeliveryMode | null): number {
  if (deliveryMode !== "delivery") return 0;
  if (subtotalGr === 0) return 0;
  if (subtotalGr >= config.delivery.freeFromGr) return 0;
  return config.delivery.feeGr;
}

/** Компактное представление корзины — уходит в результат инструмента и в чек. */
export function describeCart(cart: PricedCart, deliveryMode: DeliveryMode | null): string {
  if (cart.lines.length === 0) return "Корзина пуста.";
  const rows = cart.lines.map(
    (line) =>
      `${line.title} × ${line.quantity} = ${formatPrice(line.lineTotalGr)}` +
      (line.quantity > 1 ? ` (по ${formatPrice(line.priceGr)})` : "")
  );
  const tail: string[] = [`Сумма: ${formatPrice(cart.subtotalGr)}`];
  if (deliveryMode === "delivery") {
    tail.push(
      cart.deliveryGr === 0
        ? "Доставка: бесплатно"
        : `Доставка: ${formatPrice(cart.deliveryGr)}`
    );
    tail.push(`Итого: ${formatPrice(cart.totalGr)}`);
  }
  return [...rows, ...tail].join("\n");
}
