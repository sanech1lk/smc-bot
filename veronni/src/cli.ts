import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { createLlmCall } from "./agent/client.js";
import { handleMessage } from "./handle.js";
import { resetConversation } from "./conversation.js";
import { renderKitchenTicket } from "./order.js";

// Разговор с агентом прямо в терминале — чтобы проверять и показывать логику
// заказа, не заводя бота в Telegram. Нужен только ANTHROPIC_API_KEY.
const CHAT_ID = "cli";

async function main() {
  if (!config.anthropicKey) {
    console.error("ANTHROPIC_API_KEY не задан — агенту нечем думать.");
    process.exit(1);
  }
  const menuSize = await prisma.menuItem.count({ where: { available: true } });
  if (menuSize === 0) {
    console.error("Меню пустое. Выполните: npm run setup");
    process.exit(1);
  }

  await resetConversation(CHAT_ID);
  const call = createLlmCall();
  const rl = createInterface({ input: stdin, output: stdout });

  console.log(`${config.restaurant.name} — разговор в терминале. Пустая строка или Ctrl+C — выход.\n`);

  for (;;) {
    const text = (await rl.question("вы: ")).trim();
    if (!text) break;
    const { reply, order } = await handleMessage(CHAT_ID, text, call);
    console.log(`\nбот: ${reply}\n`);
    if (order) {
      console.log("──── на кухню ушло ────");
      console.log(renderKitchenTicket(order));
      console.log("───────────────────────\n");
    }
  }

  rl.close();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
