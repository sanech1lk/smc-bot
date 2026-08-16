import { Bot } from "grammy";
import { config } from "../config.js";
import { handleMessage } from "../handle.js";
import { loadMenu, renderMenuForCustomer } from "../menu.js";
import { resetConversation } from "../conversation.js";
import { createLlmCall } from "../agent/client.js";
import { changeOrderStatus } from "../status.js";
import { notifyKitchen, statusKeyboard, ticketWithStatus } from "./kitchen.js";
import { statusLabels, type OrderStatus } from "../order.js";

const GREETING = [
  `Привет! Это ${config.restaurant.name} 🍕`,
  "",
  "Напишите, что хотите — обычными словами. Например: «две маргариты 32 и колу, доставка на Długa 12».",
  "",
  "/menu — посмотреть меню",
  "/start — начать заказ заново",
].join("\n");

/**
 * Индикатор «печатает».
 *
 * Telegram гасит его через пять секунд, а ответ агента с вызовами инструментов
 * может занять дольше — поэтому обновляем, пока думаем. Клиент не должен
 * гадать, дошло сообщение или нет.
 */
function keepTyping(bot: Bot, chatId: number): () => void {
  const send = () => {
    bot.api.sendChatAction(chatId, "typing").catch(() => undefined);
  };
  send();
  const timer = setInterval(send, 4000);
  return () => clearInterval(timer);
}

export function createBot(): Bot {
  const bot = new Bot(config.telegramToken);
  const call = createLlmCall();

  bot.command("start", async (ctx) => {
    await resetConversation(String(ctx.chat.id));
    await ctx.reply(GREETING);
  });

  bot.command("help", (ctx) => ctx.reply(GREETING));

  bot.command("menu", async (ctx) => {
    const items = await loadMenu();
    const text = renderMenuForCustomer(items);
    // Лимит сообщения в Telegram — 4096 символов, меню в него не влезает.
    for (const chunk of splitForTelegram(text)) await ctx.reply(chunk);
  });

  bot.on("message:text", async (ctx) => {
    // Чат кухни — служебный: там переписываются повара, агент туда не лезет.
    if (String(ctx.chat.id) === config.kitchenChatId) return;

    const stopTyping = keepTyping(bot, ctx.chat.id);
    try {
      const { reply, order } = await handleMessage(String(ctx.chat.id), ctx.message.text, call);
      await ctx.reply(reply);
      if (order) await notifyKitchen(bot, order);
    } catch (error) {
      console.error("Ошибка обработки сообщения:", error);
      await ctx.reply(
        `Извините, что-то сломалось на нашей стороне. Позвоните, пожалуйста: ${config.restaurant.phone}`
      );
    } finally {
      stopTyping();
    }
  });

  bot.on(["message:voice", "message:audio", "message:photo", "message:document"], (ctx) =>
    ctx.reply("Пока принимаю заказы только текстом — напишите, пожалуйста, словами 🙂")
  );

  bot.on("callback_query:data", async (ctx) => {
    const match = /^status:(\d+):([a-z_]+)$/.exec(ctx.callbackQuery.data);
    if (!match) {
      await ctx.answerCallbackQuery();
      return;
    }
    const number = Number(match[1]);
    const status = match[2] ?? "";

    const updated = await changeOrderStatus(bot, number, status);
    if (!updated) {
      await ctx.answerCallbackQuery({ text: "Заказ не найден" });
      return;
    }

    await ctx.answerCallbackQuery({ text: statusLabels[updated.status as OrderStatus] ?? "Готово" });
    try {
      await ctx.editMessageText(ticketWithStatus(updated), {
        reply_markup: statusKeyboard(updated.number, updated.status as OrderStatus),
      });
    } catch {
      // Текст не изменился или сообщение слишком старое — не повод падать.
    }
  });

  bot.catch((error) => console.error("Ошибка grammY:", error));

  return bot;
}

export function splitForTelegram(text: string, limit = 3800): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of text.split("\n\n")) {
    if (current && current.length + paragraph.length + 2 > limit) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}
