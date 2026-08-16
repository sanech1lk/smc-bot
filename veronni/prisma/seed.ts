import { PrismaClient } from "@prisma/client";
import { menu } from "./menu-data.js";

const prisma = new PrismaClient();

// upsert, а не deleteMany: на позиции меню ссылаются строки уже принятых
// заказов, и снести их значило бы потерять историю.
async function main() {
  let created = 0;
  let updated = 0;

  for (const [index, item] of menu.entries()) {
    const data = {
      category: item.category,
      name: item.name,
      description: item.description,
      size: item.size ?? null,
      priceGr: item.priceGr,
      vegetarian: item.vegetarian ?? false,
      spicy: item.spicy ?? false,
      available: true,
      sortOrder: index,
    };
    const existing = await prisma.menuItem.findUnique({ where: { id: item.id } });
    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data,
    });
    if (existing) updated += 1;
    else created += 1;
  }

  // Позиции, которых больше нет в файле меню, не удаляем, а прячем: заказы
  // на них могли быть, а показывать их клиенту уже нельзя.
  const ids = menu.map((item) => item.id);
  const hidden = await prisma.menuItem.updateMany({
    where: { id: { notIn: ids }, available: true },
    data: { available: false },
  });

  console.log(`Меню: добавлено ${created}, обновлено ${updated}, снято с продажи ${hidden.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
