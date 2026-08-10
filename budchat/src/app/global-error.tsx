"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Last line of defence: an error thrown by the root layout itself, where even
 * the theme and fonts are gone. It has to render its own <html>/<body>, so the
 * styling here is deliberately inline and self-contained.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
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
            Приложение не смогло запуститься
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.5, color: "#9aa0a6", margin: "0 0 24px" }}>
            Мы уже знаем о проблеме. Попробуйте перезагрузить — данные не потеряны.
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
            Перезагрузить
          </button>
        </div>
      </body>
    </html>
  );
}
