import type { MenuItem } from "@prisma/client";
import { prisma } from "./db.js";
import { formatPrice } from "./money.js";
import { categoryLabels } from "../prisma/menu-data.js";

export type MenuIndex = Map<string, MenuItem>;

/** Название, как его увидит клиент в чеке: «Margherita 32 cm». */
export function itemTitle(item: Pick<MenuItem, "name" | "size">): string {
  return item.size ? `${item.name} ${item.size}` : item.name;
}

export async function loadMenu(): Promise<MenuItem[]> {
  return prisma.menuItem.findMany({
    where: { available: true },
    orderBy: [{ sortOrder: "asc" }],
  });
}

export function indexMenu(items: MenuItem[]): MenuIndex {
  return new Map(items.map((item) => [item.id, item]));
}

/**
 * Меню одним текстовым блоком для системного промпта.
 *
 * Целиком, а не через инструмент поиска: карта пиццерии — это пара тысяч
 * токенов, они уходят в кэш промпта и стоят копейки, зато агент видит цены и
 * состав сразу и не тратит лишний круг на «сейчас посмотрю».
 * id выведен явно — по нему модель и вызывает инструменты.
 */
export function renderMenuForPrompt(items: MenuItem[]): string {
  const byCategory = new Map<string, MenuItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const sections: string[] = [];
  for (const [category, categoryItems] of byCategory) {
    const label = categoryLabels[category as keyof typeof categoryLabels] ?? category;
    const lines = categoryItems.map((item) => {
      const marks = [item.vegetarian ? "вег" : null, item.spicy ? "остро" : null]
        .filter(Boolean)
        .join(", ");
      return [
        `- id=${item.id} | ${itemTitle(item)} — ${formatPrice(item.priceGr)}`,
        item.description ? ` | ${item.description}` : "",
        marks ? ` | ${marks}` : "",
      ].join("");
    });
    sections.push(`### ${label}\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}

/** Меню для человека — по команде /menu. Без id и без служебных пометок. */
export function renderMenuForCustomer(items: MenuItem[]): string {
  const byCategory = new Map<string, MenuItem[]>();
  for (const item of items) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }

  const sections: string[] = [];
  for (const [category, categoryItems] of byCategory) {
    const label = categoryLabels[category as keyof typeof categoryLabels] ?? category;
    const lines = categoryItems.map((item) => {
      const marks = [item.vegetarian ? "🌱" : null, item.spicy ? "🌶" : null]
        .filter(Boolean)
        .join("");
      return `${itemTitle(item)}${marks ? ` ${marks}` : ""} — ${formatPrice(item.priceGr)}${
        item.description ? `\n   ${item.description}` : ""
      }`;
    });
    sections.push(`— ${label} —\n${lines.join("\n")}`);
  }
  return sections.join("\n\n");
}
