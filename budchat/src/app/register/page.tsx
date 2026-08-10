"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ErrorNote, InfoNote, Logo } from "@/components/ui";
import { AuthFooter } from "@/components/auth-footer";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
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
      <div className="animate-in mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={60} />
          <h1 className="mt-4 text-2xl font-bold">Регистрация</h1>
          <p className="mt-1 text-text-secondary">Создайте аккаунт в BudChat</p>
        </div>

        {inviteToken && (
          <div className="mb-4">
            <InfoNote>Вас пригласили на объект — он появится сразу после регистрации</InfoNote>
          </div>
        )}

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

          {error && <ErrorNote>{error}</ErrorNote>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            <UserPlus size={18} />
            {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-text-secondary">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Войти
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
