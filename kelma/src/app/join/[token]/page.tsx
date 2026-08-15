"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Logo, Skeleton } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";

/**
 * Landing page for a scanned QR / shared invite link. A signed-in user is
 * joined and redirected straight to the project; a guest is sent to
 * registration with the token preserved.
 */
export default function JoinPage() {
  const { t } = useLocale();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace(`/register?invite=${encodeURIComponent(params.token)}`);
      return;
    }

    (async () => {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(apiErrorMessage(t, data, "join.errorFallback"));
        return;
      }

      router.replace(`/projects/${data.projectId}`);
    })();
  }, [status, params.token, router, t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <Logo size={60} />

      {error ? (
        <>
          <XCircle size={40} className="mt-6 text-status-red" strokeWidth={1.75} />
          <h1 className="mt-3 text-xl font-bold">{t("join.errorTitle")}</h1>
          <p className="mt-1.5 max-w-xs text-text-secondary">{error}</p>
          <Link href="/projects" className="btn-secondary mt-6">
            {t("common.backToProjects")}
          </Link>
        </>
      ) : (
        <>
          <CheckCircle2 size={40} className="mt-6 text-status-green" strokeWidth={1.75} />
          <h1 className="mt-3 text-xl font-bold">{t("join.joiningTitle")}</h1>
          <div className="mt-6 w-full max-w-xs space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </>
      )}
    </div>
  );
}
