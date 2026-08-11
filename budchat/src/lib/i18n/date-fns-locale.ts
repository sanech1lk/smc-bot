import { cs, de, enUS, pl, ru, uk } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { LocaleCode } from "@/lib/i18n";

/**
 * date-fns ships its own locale objects (month/weekday names, "3 days ago"
 * phrasing) separately from this app's UI dictionary — the two are unrelated
 * mechanisms that happen to need the same key. Every date formatted with
 * `format(date, "d MMMM", { locale: ... })` anywhere in the app should read
 * this instead of importing a fixed language directly.
 */
const DATE_FNS_LOCALES: Record<LocaleCode, Locale> = { ru, en: enUS, pl, uk, de, cs };

export function dateFnsLocale(locale: LocaleCode): Locale {
  return DATE_FNS_LOCALES[locale];
}
