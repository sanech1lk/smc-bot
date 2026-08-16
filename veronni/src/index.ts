import { config, missingRuntimeConfig } from "./config.js";
import { prisma } from "./db.js";
import { createBot } from "./telegram/bot.js";
import { createAdminServer } from "./admin/server.js";

async function main() {
  const problems = missingRuntimeConfig();
  if (problems.length > 0) {
    console.error("Не хватает настроек в .env:\n" + problems.map((p) => `  • ${p}`).join("\n"));
    console.error("\nСкопируйте .env.example в .env и заполните — см. README.md");
    process.exit(1);
  }

  const menuSize = await prisma.menuItem.count({ where: { available: true } });
  if (menuSize === 0) {
    console.error("В базе нет ни одной позиции меню. Выполните: npm run setup");
    process.exit(1);
  }

  const bot = createBot();
  const admin = createAdminServer(bot);

  admin.listen(config.adminPort, () => {
    console.log(`Админка: http://localhost:${config.adminPort}`);
  });

  const me = await bot.api.getMe();
  console.log(`Бот @${me.username} запущен. Позиций в меню: ${menuSize}.`);
  // start() не резолвится, пока бот работает, поэтому await здесь последним.
  await bot.start({ onStart: () => console.log("Слушаю сообщения…") });
}

async function shutdown(signal: string) {
  console.log(`\n${signal} — останавливаюсь`);
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
