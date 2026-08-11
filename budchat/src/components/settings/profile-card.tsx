"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";
import { Avatar, ErrorNote } from "@/components/ui";

/** Name and phone, editable inline. Email is shown but never changes here —
 *  it is the sign-in identity and changing it needs its own verified flow. */
export function ProfileCard() {
  const { data: session, update: updateSession } = useSession();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [phone, setPhone] = useState(session?.user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session?.user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null })
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось сохранить");
      return;
    }
    await updateSession({ name: name.trim(), phone: phone.trim() || undefined });
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="card space-y-3">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя"
          required
          minLength={2}
        />
        <input
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Телефон (необязательно)"
          type="tel"
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => {
              setEditing(false);
              setError(null);
              setName(session.user.name);
              setPhone(session.user.phone ?? "");
            }}
          >
            Отмена
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card flex items-center gap-3">
      <Avatar name={session.user.name} id={session.user.id} size={52} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold">{session.user.name}</p>
        <p className="truncate text-sm text-text-secondary">{session.user.email}</p>
        {session.user.phone && <p className="truncate text-sm text-text-muted">{session.user.phone}</p>}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-text-secondary active:scale-95"
        aria-label="Изменить профиль"
      >
        <Pencil size={16} />
      </button>
    </div>
  );
}
