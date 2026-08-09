"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Не удалось зарегистрироваться");
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
      setError("Ошибка сети, попробуйте снова");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-bold text-white">
            Б
          </div>
          <h1 className="text-2xl font-bold">Регистрация</h1>
          <p className="mt-1 text-text-secondary">Создайте аккаунт в BudChat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type="text"
            placeholder="Имя"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            type="tel"
            placeholder="Телефон (необязательно)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Пароль (минимум 6 символов)"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-text-secondary">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
