import { useEffect, useLayoutEffect } from "react";
import { ru } from "@/lib/i18n/locales/ru";

export const SUPPORTED_LOCALES = [
  { code: "ru", nativeLabel: "Русский" },
  { code: "en", nativeLabel: "English" },
  { code: "pl", nativeLabel: "Polski" },
  { code: "uk", nativeLabel: "Українська" },
  { code: "de", nativeLabel: "Deutsch" },
  { code: "cs", nativeLabel: "Čeština" }
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

/**
 * The app was built Russian-first, so it stays the fallback: the language
 * the server always renders (there is no server-side locale detection here),
 * and what a lookup falls back to if a key is ever missing in another
 * dictionary.
 */
export const DEFAULT_LOCALE: LocaleCode = "ru";

export const LOCALE_STORAGE_KEY = "budchat-locale";

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && SUPPORTED_LOCALES.some((l) => l.code === value);
}

/**
 * Matches the browser's language preference list against the six supported
 * locales, most-preferred first. `navigator.languages` carries entries like
 * "pl-PL" or "uk"; only the primary subtag is compared, so a Polish user in
 * Germany's "pl-DE" locale still resolves to Polish, not German.
 */
export function detectPreferredLocale(candidates: readonly string[]): LocaleCode {
  for (const raw of candidates) {
    const primary = raw.toLowerCase().split("-")[0];
    const match = SUPPORTED_LOCALES.find((l) => l.code === primary);
    if (match) return match.code;
  }
  return DEFAULT_LOCALE;
}

/**
 * Every dictionary must carry exactly the keys `ru` has — this type turns
 * every leaf of the canonical dictionary into a plain `string`, so assigning
 * a translation object to it is a compile error if a key is missing, extra,
 * or nested wrong. That parity check is what keeps six hand-written
 * dictionaries from drifting apart silently.
 */
type DeepStringify<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]> };
export type Dictionary = DeepStringify<typeof ru>;

function lookup(dict: Dictionary, path: string): string | undefined {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (typeof cur !== "object" || cur === null || !(part in (cur as Record<string, unknown>))) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

/**
 * Resolves a dot-path (e.g. "auth.login.submit") against a dictionary, with
 * two safety nets: fall back to Russian if the active language is missing
 * the key, then fall back to the raw path itself so a broken key is visible
 * in the UI as a mistake to fix, never a blank space or a thrown error.
 */
export function translate(
  dict: Dictionary,
  fallback: Dictionary,
  path: string,
  params?: Record<string, string | number>
): string {
  const raw = lookup(dict, path) ?? lookup(fallback, path) ?? path;
  return interpolate(raw, params);
}

/**
 * `useLayoutEffect` on the client, `useEffect` on the server. The locale
 * provider needs the layout-effect timing — firing after hydration commits
 * but before the browser paints — so a non-Russian phone shows its own
 * language on first paint instead of a visible flash of Russian text. Plain
 * `useLayoutEffect` would print a harmless but noisy warning during SSR;
 * this swap avoids it exactly the way React's own docs recommend.
 */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
