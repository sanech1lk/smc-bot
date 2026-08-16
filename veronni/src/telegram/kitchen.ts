import { Bot, InlineKeyboard } from "grammy";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { renderKitchenTicket, statusLabels, type OrderWithItems, type OrderStatus } from "../order.js";

/** Кнопки под талоном: следующий шаг заказа одним нажатием прямо в чате кухни. */
export function statusKeyboard(number: number, status: OrderStatus): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const flow: Array<[OrderStatus, string]> = [
    ["cooking", "🔥 Готовим"],
    ["on_way", "🛵 Отдали курьеру"],
    ["done", "✅ Выдан"],
  ];
  for (const [value, label] of flow) {
    if (value !== status) keyboard.text(label, `status:${number}:${value}`);
  }
  if (status !== "cancelled" && status !== "done") {
    keyboard.row().text("✖️ Отменить", `status:${number}:cancelled`);
  }
  return keyboard;
}

export function ticketWithStatus(order: OrderWithItems): string {
  const status = order.status as OrderStatus;
  const suffix = status === "new" ? "" : `\n\nСтатус: ${statusLabels[status] ?? order.status}`;
  return renderKitchenTicket(order) + suffix;
}

/**
 * Талон на кухню.
 *
 * Ошибка отправки не должна ронять ответ клиенту: заказ уже в базе и виден в
 * админке, поэтому здесь только лог, а не throw.
 */
export async function notifyKitchen(bot: Bot, order: OrderWithItems): Promise<void> {
  if (!config.kitchenChatId) {
    console.warn(`KITCHEN_CHAT_ID не задан — заказ №${order.number} никуда не отправлен`);
    return;
  }
  try {
    await bot.api.sendMessage(config.kitchenChatId, ticketWithStatus(order), {
      reply_markup: statusKeyboard(order.number, order.status as OrderStatus),
    });
  } catch (error) {
    console.error(`Не удалось отправить заказ №${order.number} на кухню:`, error);
  }
}

/** Сообщить клиенту, что с его заказом происходит. */
export async function notifyCustomer(bot: Bot, number: number, status: OrderStatus): Promise<void> {
  const order = await prisma.order.findUnique({ where: { number } });
  if (!order) return;

  const texts: Partial<Record<OrderStatus, string>> = {
    cooking: `Заказ №${number} готовится 👨‍🍳`,
    on_way: order.deliveryMode === "delivery"
      ? `Заказ №${number} у курьера, скоро будет 🛵`
      : `Заказ №${number} готов, можно забирать 🏠`,
    done: `Заказ №${number} выдан. Спасибо, что выбрали ${config.restaurant.name}!`,
    cancelled: `Заказ №${number} отменён. Если это ошибка — позвоните нам: ${config.restaurant.phone}`,
  };

  const text = texts[status];
  if (!text) return;
  try {
    await bot.api.sendMessage(order.chatId, text);
  } catch (error) {
    console.error(`Не удалось уведомить клиента по заказу №${number}:`, error);
  }
}
