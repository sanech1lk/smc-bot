"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ErrorNote, Logo } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("auth.resetPassword.errorMismatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("auth.resetPassword.errorGeneric"));
      return;
    }

    router.push("/login?reset=1");
  }

  if (!token) {
    return (
      <div className="animate-in mx-auto w-full max-w-sm text-center">
        <Logo size={64} glow />
        <h1 className="mt-5 text-[1.75rem] font-bold tracking-tight">{t("auth.resetPassword.invalidTitle")}</h1>
        <p className="mt-2 text-text-secondary">{t("auth.resetPassword.invalidNote")}</p>
        <Link href="/forgot-password" className="btn-primary mt-6 w-full">
          {t("auth.resetPassword.requestLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo size={64} glow />
        <h1 className="mt-5 text-[1.75rem] font-bold tracking-tight">{t("auth.resetPassword.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("auth.resetPassword.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="input"
          type="password"
          placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          <KeyRound size={18} />
          {loading ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="hero-wash flex min-h-screen flex-col justify-center px-6 py-10">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
