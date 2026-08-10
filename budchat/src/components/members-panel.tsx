"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MailPlus, QrCode, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { Avatar, ErrorNote, InfoNote } from "@/components/ui";
import type { ProjectMemberSummary, ProjectRole } from "@/types/models";

const ROLE_LABEL: Record<ProjectRole, string> = {
  ADMIN: "Админ",
  WORKER: "Рабочий",
  CLIENT: "Заказчик"
};

const ROLE_CHIP: Record<ProjectRole, string> = {
  ADMIN: "bg-brand/15 text-brand",
  WORKER: "bg-accent/12 text-accent",
  CLIENT: "bg-status-green/15 text-status-green"
};

interface PendingInvitation {
  id: string;
  email: string | null;
  role: ProjectRole;
  expiresAt: string;
}

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
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [qr, setQr] = useState<{ url: string; dataUrl: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const isAdmin = myRole === "ADMIN";

  const loadInvitations = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (res.ok) {
      const data = await res.json();
      setInvitations(data.invitations ?? []);
    }
  }, [projectId]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
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
    if (data.invited) {
      setNotice("Приглашение отправлено — участник появится сразу после регистрации");
      loadInvitations();
    } else {
      onChange();
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Удалить участника из объекта?")) return;
    const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) onChange();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось удалить участника");
    }
  }

  async function revokeInvitation(id: string) {
    const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    if (res.ok) loadInvitations();
  }

  async function generateQr() {
    setQrLoading(true);
    const res = await fetch(`/api/projects/${projectId}/invite-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "WORKER" })
    });
    setQrLoading(false);
    if (res.ok) {
      const data = await res.json();
      setQr({ url: data.url, dataUrl: data.qrDataUrl });
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <>
          <form onSubmit={handleAdd} className="card space-y-3">
            <p className="flex items-center gap-2 font-semibold">
              <UserPlus size={18} className="text-text-secondary" />
              Добавить участника
            </p>
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
                  className={`chip flex-1 justify-center py-2 transition-colors ${
                    role === r ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            {notice && <InfoNote>{notice}</InfoNote>}
            <p className="text-xs text-text-muted">
              Если человек ещё не зарегистрирован — он получит приглашение на почту.
            </p>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <MailPlus size={18} />
              {loading ? "Добавляем…" : "Добавить"}
            </button>
          </form>

          <div className="card space-y-3">
            <p className="flex items-center gap-2 font-semibold">
              <QrCode size={18} className="text-text-secondary" />
              QR-код для бригады
            </p>
            <p className="text-sm text-text-secondary">
              Рабочий сканирует код на объекте и попадает сюда без ввода email.
            </p>
            {qr ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr.dataUrl}
                  alt="QR-код приглашения"
                  className="h-56 w-56 rounded-xl bg-white p-2"
                />
                <p className="break-all text-center text-xs text-text-muted">{qr.url}</p>
                <button type="button" className="btn-secondary w-full" onClick={generateQr}>
                  Обновить код
                </button>
              </div>
            ) : (
              <button type="button" className="btn-secondary w-full" onClick={generateQr} disabled={qrLoading}>
                <QrCode size={18} />
                {qrLoading ? "Готовим…" : "Показать QR-код"}
              </button>
            )}
          </div>
        </>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card flex items-center gap-3">
            <Avatar name={m.user?.name ?? "?"} id={m.userId} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.user?.name}</p>
              <p className="truncate text-sm text-text-secondary">{m.user?.email}</p>
            </div>
            <span className={`chip flex-shrink-0 py-1 text-xs ${ROLE_CHIP[m.role]}`}>
              {m.role === "ADMIN" && <ShieldCheck size={13} />}
              {ROLE_LABEL[m.role]}
            </span>
            {isAdmin && (
              <button
                onClick={() => handleRemove(m.id)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-status-red"
                aria-label={`Удалить ${m.user?.name}`}
              >
                <Trash2 size={17} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && invitations.length > 0 && (
        <div>
          <p className="label mb-2">Ожидают регистрации</p>
          <div className="space-y-2">
            {invitations
              .filter((inv) => inv.email)
              .map((inv) => (
                <div key={inv.id} className="card flex items-center gap-3 border-dashed">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
                    <MailPlus size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{inv.email}</p>
                    <p className="text-xs text-text-muted">приглашение отправлено</p>
                  </div>
                  <span className={`chip flex-shrink-0 py-1 text-xs ${ROLE_CHIP[inv.role]}`}>
                    {ROLE_LABEL[inv.role]}
                  </span>
                  <button
                    onClick={() => revokeInvitation(inv.id)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                    aria-label="Отозвать приглашение"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
