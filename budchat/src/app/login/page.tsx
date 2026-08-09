"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-bold text-white">
            Б
          </div>
          <h1 className="text-2xl font-bold">BudChat</h1>
          <p className="mt-1 text-text-secondary">Мессенджер для строительных бригад</p>
        </div>

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
          <input
            className="input"
            type="password"
            placeholder="Пароль"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-text-secondary">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-brand">
            Зарегистрироваться
          </Link>
        </p>

        <div className="mt-8 rounded-xl border border-border-soft bg-bg-card p-4 text-sm text-text-secondary">
          <p className="mb-1 font-semibold text-text-primary">Демо-доступ</p>
          <p>prorab@budchat.dev / password123 (админ)</p>
          <p>master@budchat.dev / password123 (рабочий)</p>
          <p>client@budchat.dev / password123 (заказчик)</p>
        </div>
      </div>
    </div>
  );
}
