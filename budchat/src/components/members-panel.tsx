"use client";

import { useState, type FormEvent } from "react";
import type { ProjectMemberSummary, ProjectRole } from "@/types/models";

const ROLE_LABEL: Record<ProjectRole, string> = {
  ADMIN: "Админ",
  WORKER: "Рабочий",
  CLIENT: "Заказчик"
};

export function MembersPanel({
  projectId,
  members,
  myRole,
  onChange
}: {
  projectId: string;
  members: ProjectMemberSummary[];
  myRole: ProjectRole;
  onChange: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("WORKER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isAdmin = myRole === "ADMIN";

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не удалось добавить участника");
      return;
    }

    setEmail("");
    onChange();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Удалить участника из объекта?")) return;
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) onChange();
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <p className="font-semibold">Добавить участника по email</p>
          <input
            className="input"
            type="email"
            placeholder="email@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            {(["WORKER", "CLIENT", "ADMIN"] as ProjectRole[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`chip flex-1 justify-center py-2 ${
                  role === r ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          {error && <p className="rounded-xl bg-status-red/10 px-4 py-2 text-status-red">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Добавляем…" : "Добавить"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-lg font-bold">
              {m.user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.user?.name}</p>
              <p className="truncate text-sm text-text-secondary">{m.user?.email}</p>
            </div>
            <span className="chip bg-bg-elevated text-text-secondary">{ROLE_LABEL[m.role]}</span>
            {isAdmin && (
              <button
                onClick={() => handleRemove(m.id)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-status-red active:bg-status-red/10"
                aria-label="Удалить"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
