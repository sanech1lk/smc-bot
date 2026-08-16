import type { Bot } from "grammy";
import { prisma } from "./db.js";
import { isOrderStatus, type OrderStatus, type OrderWithItems } from "./order.js";
import { notifyCustomer } from "./telegram/kitchen.js";

/**
 * Единственная точка смены статуса — её зовут и кнопки в чате кухни, и админка,
 * чтобы клиент получал уведомление независимо от того, откуда нажали.
 */
export async function changeOrderStatus(
  bot: Bot | null,
  number: number,
  status: string
): Promise<OrderWithItems | null> {
  if (!isOrderStatus(status)) return null;
  const existing = await prisma.order.findUnique({ where: { number } });
  if (!existing) return null;
  if (existing.status === status) {
    return prisma.order.findUnique({ where: { number }, include: { items: true } });
  }

  const updated = await prisma.order.update({
    where: { number },
    data: { status },
    include: { items: true },
  });
  if (bot) await notifyCustomer(bot, number, status as OrderStatus);
  return updated;
}
