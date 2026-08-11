"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * Recoverable crash inside a page: the theme and navigation still work, so the
 * user gets a real way out instead of a blank screen. `reset` re-renders the
 * failed segment, which is usually enough after a dropped connection.
 */
export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-status-red/15 text-status-red">
        <AlertTriangle size={30} />
      </span>
      <h1 className="mt-5 text-xl font-bold">{t("errorPage.title")}</h1>
      <p className="mt-2 max-w-sm text-text-secondary">{t("errorPage.description")}</p>
      {error.digest && (
        <p className="mt-3 text-xs text-text-muted">
          {t("errorPage.errorCodeLabel")} <span className="tabular">{error.digest}</span>
        </p>
      )}
      <div className="mt-7 flex w-full max-w-xs flex-col gap-3">
        <button onClick={reset} className="btn-primary w-full">
          <RotateCcw size={18} />
          {t("errorPage.retry")}
        </button>
        <Link href="/projects" className="btn-secondary w-full">
          {t("common.backToProjects")}
        </Link>
      </div>
    </main>
  );
}
