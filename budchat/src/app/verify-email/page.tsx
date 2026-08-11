"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Logo, Skeleton } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";

type State = { status: "checking" } | { status: "ok"; joined: number } | { status: "failed" };

function VerifyEmailContent() {
  const { t } = useLocale();
  const params = useSearchParams();
  const { update: updateSession } = useSession();
  const [state, setState] = useState<State>({ status: "checking" });

  // React runs effects twice in development StrictMode, and this one spends a
  // single-use token — without the guard the second call always reports the
  // link as already used.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = params.get("token");
    if (!token) {
      setState({ status: "failed" });
      return;
    }

    (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        setState({ status: "failed" });
        return;
      }

      const data = await res.json().catch(() => ({ joinedProjects: 0 }));
      setState({ status: "ok", joined: data.joinedProjects ?? 0 });
      // Clears the banner without making the person sign out and back in.
      updateSession({ emailVerified: true }).catch(() => {});
    })();
  }, [params, updateSession]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <Logo size={60} />

      {state.status === "checking" && (
        <>
          <h1 className="mt-6 text-xl font-bold">{t("emailVerification.pageChecking")}</h1>
          <div className="mt-6 w-full max-w-xs space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </>
      )}

      {state.status === "ok" && (
        <>
          <CheckCircle2 size={40} className="mt-6 text-status-green" strokeWidth={1.75} />
          <h1 className="mt-3 text-xl font-bold">{t("emailVerification.pageSuccessTitle")}</h1>
          <p className="mt-1.5 max-w-xs text-text-secondary">
            {t("emailVerification.pageSuccessText")}
          </p>
          {state.joined > 0 && (
            <p className="mt-2 text-sm text-brand">
              {t("emailVerification.pageJoined", { count: state.joined })}
            </p>
          )}
          <Link href="/projects" className="btn-primary mt-6">
            {t("emailVerification.goToProjects")}
          </Link>
        </>
      )}

      {state.status === "failed" && (
        <>
          <XCircle size={40} className="mt-6 text-status-red" strokeWidth={1.75} />
          <h1 className="mt-3 text-xl font-bold">{t("emailVerification.pageErrorTitle")}</h1>
          <p className="mt-1.5 max-w-xs text-text-secondary">
            {t("emailVerification.pageErrorText")}
          </p>
          <Link href="/projects" className="btn-secondary mt-6">
            {t("emailVerification.goToProjects")}
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  // useSearchParams needs a Suspense boundary to keep the route static-safe.
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
