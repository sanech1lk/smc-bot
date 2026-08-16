import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, "..");

// Свой мини-загрузчик .env вместо dotenv: одна зависимость меньше, а формат
// файла здесь ровно «KEY=value» с необязательными кавычками.
function loadDotEnv(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(projectRoot, ".env"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// В тестах .env игнорируем: иначе локальные настройки разработчика (другие
// цены, другие часы работы) начнут ронять чужие проверки.
if (!process.env.VITEST) loadDotEnv();

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${key} должно быть числом, получено «${raw}»`);
  return parsed;
}

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  /** Чат кухни: обычно группа, поэтому id отрицательный. */
  kitchenChatId: process.env.KITCHEN_CHAT_ID ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.CLAUDE_MODEL ?? "claude-opus-5",

  adminPort: num("ADMIN_PORT", 4321),
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  restaurant: {
    name: process.env.RESTAURANT_NAME ?? "Veronni",
    phone: process.env.RESTAURANT_PHONE ?? "+48 000 000 000",
    address: process.env.RESTAURANT_ADDRESS ?? "ul. Przykładowa 1, Kraków",
    /** Часы работы кухни в местном времени, включительно с opensAt до closesAt. */
    opensAt: num("OPENS_AT", 11),
    closesAt: num("CLOSES_AT", 22),
    timeZone: process.env.TIME_ZONE ?? "Europe/Warsaw",
  },

  delivery: {
    feeGr: num("DELIVERY_FEE_GR", 900),
    /** С какой суммы доставка бесплатная. */
    freeFromGr: num("FREE_DELIVERY_FROM_GR", 6000),
    minOrderGr: num("MIN_ORDER_GR", 3000),
    etaMinutes: num("DELIVERY_ETA_MINUTES", 45),
    pickupEtaMinutes: num("PICKUP_ETA_MINUTES", 25),
    zone: process.env.DELIVERY_ZONE ?? "Kraków, w promieniu 6 km od lokalu",
  },
} as const;

/** Что мешает запуститься. Пустой массив — можно стартовать. */
export function missingRuntimeConfig(): string[] {
  const problems: string[] = [];
  if (!config.telegramToken) problems.push("TELEGRAM_BOT_TOKEN не задан — бот не подключится к Telegram");
  if (!config.anthropicKey) problems.push("ANTHROPIC_API_KEY не задан — агент не сможет отвечать");
  if (!config.kitchenChatId) problems.push("KITCHEN_CHAT_ID не задан — заказы не уйдут на кухню");
  if (!config.adminPassword) problems.push("ADMIN_PASSWORD не задан — админка была бы открыта всем");
  return problems;
}
