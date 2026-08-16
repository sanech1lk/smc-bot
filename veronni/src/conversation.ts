import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./db.js";
import { parseCart, serializeCart, type CartLine, type DeliveryMode } from "./cart.js";
import type { CustomerDraft } from "./order.js";

export type ConversationState = {
  chatId: string;
  history: Anthropic.MessageParam[];
  cart: CartLine[];
  customer: CustomerDraft;
};

function parseHistory(raw: string): Anthropic.MessageParam[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((message): message is Anthropic.MessageParam => {
    if (typeof message !== "object" || message === null) return false;
    const role = (message as { role?: unknown }).role;
    return role === "user" || role === "assistant";
  });
}

function asDeliveryMode(value: string | null): DeliveryMode | null {
  return value === "delivery" || value === "pickup" ? value : null;
}

export async function loadConversation(chatId: string): Promise<ConversationState> {
  const row = await prisma.conversation.findUnique({ where: { chatId } });
  if (!row) {
    return {
      chatId,
      history: [],
      cart: [],
      customer: {
        customerName: null,
        phone: null,
        address: null,
        deliveryMode: null,
        note: null,
      },
    };
  }
  return {
    chatId,
    history: parseHistory(row.history),
    cart: parseCart(row.cart),
    customer: {
      customerName: row.customerName,
      phone: row.phone,
      address: row.address,
      deliveryMode: asDeliveryMode(row.deliveryMode),
      note: row.note,
    },
  };
}

export async function saveConversation(state: ConversationState): Promise<void> {
  const data = {
    history: JSON.stringify(state.history),
    cart: serializeCart(state.cart),
    customerName: state.customer.customerName,
    phone: state.customer.phone,
    address: state.customer.address,
    deliveryMode: state.customer.deliveryMode,
    note: state.customer.note,
  };
  await prisma.conversation.upsert({
    where: { chatId: state.chatId },
    create: { chatId: state.chatId, ...data },
    update: data,
  });
}

/**
 * Сброс диалога (/start и «начать заново»).
 *
 * Имя и телефон сохраняем: постоянный клиент не должен диктовать их каждый
 * раз. Адрес тоже — он у людей меняется реже, чем заказ.
 */
export async function resetConversation(chatId: string): Promise<void> {
  await prisma.conversation.upsert({
    where: { chatId },
    create: { chatId },
    update: { history: "[]", cart: "[]", note: null },
  });
}
