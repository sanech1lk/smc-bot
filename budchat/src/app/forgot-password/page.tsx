"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck, Send } from "lucide-react";
import { ErrorNote, Logo } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось отправить письмо");
      return;
    }

    setSent(true);
  }

  return (
    <div className="hero-wash flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="animate-in mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} glow />
          <h1 className="mt-5 text-[1.75rem] font-bold tracking-tight">Восстановление пароля</h1>
          <p className="mt-1 text-text-secondary">
            {sent ? "Проверьте почту" : "Введите email от вашего аккаунта"}
          </p>
        </div>

        {sent ? (
          <div className="card flex flex-col items-center text-center">
            <MailCheck size={40} className="mb-3 text-status-green" strokeWidth={1.75} />
            <p className="font-semibold">Если аккаунт существует, письмо отправлено</p>
            <p className="mt-1.5 text-sm text-text-secondary">
              Ссылка действует 1 час. Не пришло — проверьте папку «Спам».
            </p>
            <Link href="/login" className="btn-secondary mt-5 w-full">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
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
            {error && <ErrorNote>{error}</ErrorNote>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <Send size={18} />
              {loading ? "Отправляем…" : "Отправить ссылку"}
            </button>
            <Link href="/login" className="btn-ghost w-full">
              Отмена
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
