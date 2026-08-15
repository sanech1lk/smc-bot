"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ErrorNote, InfoNote, Logo } from "@/components/ui";
import { AuthFooter } from "@/components/auth-footer";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();
  const inviteToken = params.get("invite") ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, inviteToken })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(apiErrorMessage(t, data, "auth.register.errorGeneric"));
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch {
      setError(t("auth.register.errorNetwork"));
      setLoading(false);
    }
  }

  return (
    <div className="hero-wash flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="animate-in mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} glow />
          <h1 className="mt-5 text-[1.75rem] font-bold tracking-tight">{t("auth.register.title")}</h1>
          <p className="mt-1 text-text-secondary">{t("auth.register.subtitle")}</p>
        </div>

        {inviteToken && (
          <div className="mb-4">
            <InfoNote>{t("auth.register.inviteNote")}</InfoNote>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type="text"
            placeholder={t("auth.register.namePlaceholder")}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder={t("auth.login.emailPlaceholder")}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input"
            type="tel"
            placeholder={t("auth.register.phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder={t("auth.register.passwordPlaceholder")}
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <ErrorNote>{error}</ErrorNote>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <UserPlus size={18} />
            {loading ? t("auth.register.submitting") : t("auth.register.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-text-secondary">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand">
            {t("auth.register.loginLink")}
          </Link>
        </p>

        <AuthFooter />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
