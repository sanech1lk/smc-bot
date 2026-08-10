"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { ErrorNote, InfoNote, Logo } from "@/components/ui";
import { AuthFooter } from "@/components/auth-footer";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const justReset = params.get("reset") === "1";
  const nextPath = params.get("next");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push(nextPath || "/projects");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="animate-in mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={60} />
          <h1 className="mt-4 text-2xl font-bold">BudChat</h1>
          <p className="mt-1 text-text-secondary">Мессенджер для строительных бригад</p>
        </div>

        {justReset && <div className="mb-4"><InfoNote>Пароль изменён — войдите с новым паролем</InfoNote></div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              className="input pr-12"
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <LogIn size={18} />
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-text-secondary hover:text-text-primary">
            Забыли пароль?
          </Link>
        </div>

        <p className="mt-6 text-center text-text-secondary">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-brand">
            Зарегистрироваться
          </Link>
        </p>

        <div className="mt-8 rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary">
          <p className="label mb-2">Демо-доступ</p>
          <p>prorab@budchat.dev / password123 — админ</p>
          <p>master@budchat.dev / password123 — рабочий</p>
          <p>client@budchat.dev / password123 — заказчик</p>
        </div>

        <AuthFooter />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
