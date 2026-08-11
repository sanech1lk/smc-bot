import type { Dictionary, LocaleCode } from "@/lib/i18n";
import { ru } from "@/lib/i18n/locales/ru";
import { en } from "@/lib/i18n/locales/en";
import { pl } from "@/lib/i18n/locales/pl";
import { uk } from "@/lib/i18n/locales/uk";
import { de } from "@/lib/i18n/locales/de";
import { cs } from "@/lib/i18n/locales/cs";

const DICTIONARIES: Record<LocaleCode, Dictionary> = { ru, en, pl, uk, de, cs };

export function getDictionary(locale: LocaleCode): Dictionary {
  return DICTIONARIES[locale];
}
