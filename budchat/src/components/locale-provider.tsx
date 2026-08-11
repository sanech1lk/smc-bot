"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectPreferredLocale,
  isLocaleCode,
  translate,
  useIsomorphicLayoutEffect,
  type LocaleCode
} from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/locales";

interface LocaleContextValue {
  locale: LocaleCode;
  /** True once the real (stored or detected) locale has been applied — lets
   *  the language picker avoid flashing "Russian" as the current choice for
   *  a split second before the client-only detection runs. */
  ready: boolean;
  /** True when the current locale came from matching the phone's language,
   *  not from an explicit choice — the settings screen uses this to explain
   *  why a language is already selected the first time someone opens it. */
  autoDetected: boolean;
  setLocale: (locale: LocaleCode) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const fallbackDict = getDictionary(DEFAULT_LOCALE);

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  ready: false,
  autoDetected: false,
  setLocale: () => {},
  t: (path) => path
});

export const useLocale = () => useContext(LocaleContext);

/**
 * Detects and applies the interface language.
 *
 * The server always renders Russian (there is no server-side locale
 * awareness in this app), so the initial client state has to match that
 * exactly or React logs a hydration mismatch — the same class of bug fixed
 * earlier for the vibration-support check. The real locale is picked up in
 * a layout effect instead: it runs after hydration reconciles successfully,
 * but before the browser paints, so a phone set to Polish still shows
 * Polish on the very first frame the user actually sees.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const hadStoredChoice = isLocaleCode(stored);
    const resolved = hadStoredChoice
      ? stored
      : detectPreferredLocale(navigator.languages ?? [navigator.language]);

    document.documentElement.lang = resolved;
    if (resolved !== DEFAULT_LOCALE) setLocaleState(resolved);
    setAutoDetected(!hadStoredChoice);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLocaleState(next);
    setAutoDetected(false);
  }, []);

  const dict = getDictionary(locale);
  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => translate(dict, fallbackDict, path, params),
    [dict]
  );

  return (
    <LocaleContext.Provider value={{ locale, ready, autoDetected, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
