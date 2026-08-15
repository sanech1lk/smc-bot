"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
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

const fallbackDict = getDictionary(DEFAULT_LOCALE);

/**
 * Last line of defence: an error thrown by the root layout itself, where even
 * the theme and fonts are gone. It has to render its own <html>/<body>, so the
 * styling here is deliberately inline and self-contained — including its own
 * minimal locale detection, since LocaleProvider lives inside the very layout
 * that just crashed and can't be relied on here.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const [locale, setLocale] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const resolved = isLocaleCode(stored)
      ? stored
      : detectPreferredLocale(navigator.languages ?? [navigator.language]);
    setLocale(resolved);
  }, []);

  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, fallbackDict, path);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b0d12",
          color: "#f3f4f6",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center"
        }}
      >
        <div style={{ maxWidth: "420px" }}>
          <p style={{ fontSize: "44px", margin: "0 0 12px" }}>🔧</p>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 10px" }}>
            {t("globalError.title")}
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.5, color: "#9aa0a6", margin: "0 0 24px" }}>
            {t("globalError.description")}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              minHeight: "52px",
              padding: "0 28px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#fff",
              background: "#ff7a1a",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer"
            }}
          >
            {t("globalError.reload")}
          </button>
        </div>
      </body>
    </html>
  );
}
