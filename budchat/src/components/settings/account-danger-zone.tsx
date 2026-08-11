"use client";

import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Download, KeyRound, Trash2 } from "lucide-react";
import { ErrorNote, InfoNote, SettingRow, SettingSection, Sheet } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";

export function AccountDangerZone() {
  const { t } = useLocale();
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
      alert(t("accountDanger.exportError"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SettingSection title={t("accountDanger.title")}>
        <SettingRow
          icon={KeyRound}
          title={t("accountDanger.changePasswordTitle")}
          description={t("accountDanger.changePasswordDescription")}
          control={<span className="text-sm text-text-muted">→</span>}
          onClick={() => setPasswordOpen(true)}
        />
        <SettingRow
          icon={Download}
          title={t("accountDanger.exportTitle")}
          description={t("accountDanger.exportDescription")}
          control={<span className="text-sm text-text-muted">{exporting ? "…" : "→"}</span>}
          onClick={exporting ? undefined : handleExport}
        />
        <SettingRow
          icon={Trash2}
          title={t("accountDanger.deleteAccountTitle")}
          description={t("accountDanger.deleteAccountDescription")}
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
  const { t } = useLocale();
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
      setError(t("accountDanger.passwordMismatch"));
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
      setError(apiErrorMessage(t, data, "accountDanger.errorChangePassword"));
      return;
    }
    setDone(true);
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="text-lg font-bold">{t("accountDanger.passwordSheetTitle")}</h3>

      {done ? (
        <>
          <InfoNote>{t("accountDanger.passwordChanged")}</InfoNote>
          <button className="btn-primary mt-4 w-full" onClick={onClose}>
            {t("common.done")}
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            className="input"
            type="password"
            placeholder={t("accountDanger.currentPasswordPlaceholder")}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder={t("accountDanger.newPasswordPlaceholder")}
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder={t("accountDanger.confirmPasswordPlaceholder")}
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t("accountDanger.savingPassword") : t("accountDanger.submitChangePassword")}
          </button>
        </form>
      )}
    </Sheet>
  );
}

function DeleteAccountSheet({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const { t } = useLocale();
  const deleteConfirmWord = t("accountDanger.deleteConfirmWord");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmText.trim().toUpperCase() === deleteConfirmWord;

  async function handleDelete() {
    if (!canDelete) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(t, data, "accountDanger.errorDelete"));
      return;
    }
    onDeleted();
  }

  return (
    <Sheet onClose={onClose}>
      <h3 className="text-lg font-bold text-status-red">{t("accountDanger.deleteSheetTitle")}</h3>
      <p className="mt-2 text-text-secondary">{t("accountDanger.deleteBody1")}</p>
      <p className="mt-2 text-sm text-text-muted">{t("accountDanger.deleteBody2")}</p>
      <p className="mt-4 text-sm font-medium">
        {t("accountDanger.deleteConfirmPrompt", { word: deleteConfirmWord })}
      </p>
      <input
        className="input mt-2"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={deleteConfirmWord}
        autoCapitalize="characters"
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button className="btn-danger flex-1" onClick={handleDelete} disabled={!canDelete || loading}>
          {loading ? t("accountDanger.deleting") : t("accountDanger.deleteCta")}
        </button>
      </div>
    </Sheet>
  );
}
