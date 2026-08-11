"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Download, KeyRound, Trash2 } from "lucide-react";
import { ErrorNote, InfoNote, SettingRow, SettingSection, Sheet } from "@/components/ui";

const DELETE_CONFIRM_WORD = "УДАЛИТЬ";

export function AccountDangerZone() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budchat-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Не удалось выгрузить данные. Попробуйте ещё раз.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SettingSection title="Аккаунт и данные">
        <SettingRow
          icon={KeyRound}
          title="Сменить пароль"
          description="Понадобится текущий пароль"
          control={<span className="text-sm text-text-muted">→</span>}
          onClick={() => setPasswordOpen(true)}
        />
        <SettingRow
          icon={Download}
          title="Выгрузить мои данные"
          description="Сообщения, фото, задачи и смены — файлом JSON"
          control={<span className="text-sm text-text-muted">{exporting ? "…" : "→"}</span>}
          onClick={exporting ? undefined : handleExport}
        />
        <SettingRow
          icon={Trash2}
          title="Удалить аккаунт"
          description="Личные данные удаляются безвозвратно"
          control={<span className="text-sm text-status-red">→</span>}
          onClick={() => setDeleteOpen(true)}
        />
      </SettingSection>

      {passwordOpen && <PasswordSheet onClose={() => setPasswordOpen(false)} />}
      {deleteOpen && (
        <DeleteAccountSheet
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            signOut({ callbackUrl: "/login" });
          }}
        />
      )}
    </>
  );
}

function PasswordSheet({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось сменить пароль");
      return;
    }
    setDone(true);
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="text-lg font-bold">Смена пароля</h3>

      {done ? (
        <>
          <InfoNote>Пароль изменён.</InfoNote>
          <button className="btn-primary mt-4 w-full" onClick={onClose}>
            Готово
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            className="input"
            type="password"
            placeholder="Текущий пароль"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Новый пароль"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Повторите новый пароль"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Сохраняем…" : "Сменить пароль"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function DeleteAccountSheet({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmText.trim().toUpperCase() === DELETE_CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось удалить аккаунт");
      return;
    }
    onDeleted();
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="text-lg font-bold text-status-red">Удалить аккаунт</h3>
      <p className="mt-2 text-text-secondary">
        Имя, email и телефон будут удалены безвозвратно, войти в этот аккаунт станет невозможно.
        Сообщения и фото, которые вы добавили в объекты, останутся у команды — как записи от
        удалённого пользователя.
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Если вы единственный администратор на каком-то объекте, сначала назначьте там другого
        администратора — иначе удаление будет отклонено.
      </p>
      <p className="mt-4 text-sm font-medium">
        Введите «{DELETE_CONFIRM_WORD}», чтобы подтвердить:
      </p>
      <input
        className="input mt-2"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={DELETE_CONFIRM_WORD}
        autoCapitalize="characters"
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={onClose}>
          Отмена
        </button>
        <button className="btn-danger flex-1" onClick={handleDelete} disabled={!canDelete || loading}>
          {loading ? "Удаляем…" : "Удалить"}
        </button>
      </div>
    </Sheet>
  );
}
