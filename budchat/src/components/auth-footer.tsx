"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export function AuthFooter() {
  const { t } = useLocale();

  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-text-muted">
      {t("auth.footer.prefix")}{" "}
      <Link href="/legal/terms" className="underline hover:text-text-secondary">
        {t("auth.footer.terms")}
      </Link>{" "}
      {t("auth.footer.and")}{" "}
      <Link href="/legal/privacy" className="underline hover:text-text-secondary">
        {t("auth.footer.privacy")}
      </Link>
      .
    </p>
  );
}
