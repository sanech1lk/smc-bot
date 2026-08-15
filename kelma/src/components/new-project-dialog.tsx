"use client";

import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { DEFAULT_STAGE_NAMES } from "@/lib/stages";
import { CURRENCIES } from "@/lib/currency";
import { ErrorNote } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";

export function NewProjectDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [stageNames, setStageNames] = useState<string[]>([...DEFAULT_STAGE_NAMES]);
  const [newStage, setNewStage] = useState("");
  const [stagesOpen, setStagesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function addStage() {
    const value = newStage.trim();
    if (!value) return;
    setStageNames((prev) => [...prev, value]);
    setNewStage("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (stageNames.length === 0) {
      setError(t("projects.dialog.errorNoStages"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, currency, stageNames })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(apiErrorMessage(t, data, "projects.dialog.errorGeneric"));
      return;
    }

    setName("");
    setAddress("");
    setStageNames([...DEFAULT_STAGE_NAMES]);
    onCreated();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-sheet w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-5 shadow-overlay sm:my-8 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("projects.dialog.title")}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:text-text-primary"
            aria-label={t("projects.dialog.close")}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            placeholder={t("projects.dialog.namePlaceholder")}
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder={t("projects.dialog.addressPlaceholder")}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div>
            <label className="label mb-1.5 block">{t("projects.dialog.currencyLabel")}</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {t(`currencyName.${c.code}`)} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setStagesOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left transition-colors"
          >
            <span>
              {t("projects.dialog.stagesPrefix")} <span className="font-semibold">{stageNames.length}</span>
            </span>
            {stagesOpen ? (
              <ChevronUp size={18} className="text-text-muted" />
            ) : (
              <ChevronDown size={18} className="text-text-muted" />
            )}
          </button>

          {stagesOpen && (
            <div className="animate-in space-y-2 rounded-xl border border-border bg-bg-soft p-3">
              <p className="text-sm text-text-secondary">{t("projects.dialog.stagesHint")}</p>
              {stageNames.map((stageName, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-xs font-semibold text-text-secondary">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-sm">{stageName}</span>
                  <button
                    type="button"
                    onClick={() => setStageNames((prev) => prev.filter((_, i) => i !== index))}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-status-red active:bg-status-red/10"
                    aria-label={`${t("projects.dialog.removeStagePrefix")} ${stageName}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className="input py-2 text-sm"
                  placeholder={t("projects.dialog.newStagePlaceholder")}
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStage();
                    }
                  }}
                />
                <button type="button" className="btn-secondary px-3 py-2" onClick={addStage}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          )}

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? t("projects.dialog.submitting") : t("projects.dialog.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
