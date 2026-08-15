"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MailWarning } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * Shown on the projects list while the address is unconfirmed. It explains a
 * consequence the person can actually feel — invitations sent to their email
 * are waiting — rather than nagging about verification for its own sake.
 */
export function EmailVerificationBanner() {
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (status !== "authenticated" || session.user.emailVerified) return null;

  async function resend() {
    setState("sending");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setState(res.ok ? "sent" : "failed");
  }

  return (
    <div className="animate-in rounded-2xl border border-status-yellow/30 bg-status-yellow/10 p-4">
      <p className="flex items-center gap-2 font-semibold text-status-yellow">
        <MailWarning size={18} />
        {t("emailVerification.bannerTitle")}
      </p>
      <p className="mt-1.5 text-sm text-text-secondary">{t("emailVerification.bannerText")}</p>

      {state === "sent" ? (
        <p className="mt-2.5 text-sm text-status-green">{t("emailVerification.resent")}</p>
      ) : (
        <button
          onClick={resend}
          disabled={state === "sending"}
          className="mt-2.5 text-sm font-semibold text-brand underline disabled:opacity-60"
        >
          {state === "sending" ? t("emailVerification.resending") : t("emailVerification.resend")}
        </button>
      )}

      {state === "failed" && (
        <p className="mt-2 text-sm text-status-red">{t("emailVerification.resendError")}</p>
      )}
    </div>
  );
}
