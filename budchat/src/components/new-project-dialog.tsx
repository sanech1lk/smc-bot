"use client";

import { useState, type FormEvent } from "react";

export function NewProjectDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не удалось создать объект");
      return;
    }

    setName("");
    setAddress("");
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border-soft bg-bg-card p-5 sm:rounded-2xl">
        <h2 className="mb-4 text-xl font-bold">Новый объект</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            placeholder="Название объекта"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Адрес"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {error && <p className="rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Создаём…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
