"use client";

import { useState, type FormEvent } from "react";
import { DEFAULT_STAGE_NAMES } from "@/lib/stages";

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
  const [stageNames, setStageNames] = useState<string[]>([...DEFAULT_STAGE_NAMES]);
  const [newStage, setNewStage] = useState("");
  const [stagesOpen, setStagesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function removeStage(index: number) {
    setStageNames((prev) => prev.filter((_, i) => i !== index));
  }

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
      setError("Нужен хотя бы один этап");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, stageNames })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не удалось создать объект");
      return;
    }

    setName("");
    setAddress("");
    setStageNames([...DEFAULT_STAGE_NAMES]);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border-soft bg-bg-card p-5 sm:my-8 sm:rounded-2xl">
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

          <button
            type="button"
            onClick={() => setStagesOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-bg-elevated px-4 py-3 text-left"
          >
            <span>
              Этапы: <span className="font-semibold">{stageNames.length}</span>
            </span>
            <span className="text-text-secondary">{stagesOpen ? "▲" : "▼"}</span>
          </button>

          {stagesOpen && (
            <div className="space-y-2 rounded-xl border border-border-soft p-3">
              <p className="text-sm text-text-secondary">
                Список по умолчанию подходит для ремонта квартиры — уберите лишние или добавьте свои.
              </p>
              {stageNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-xs text-text-secondary">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{name}</span>
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-status-red active:bg-status-red/10"
                    aria-label="Убрать этап"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  className="input py-2"
                  placeholder="Новый этап"
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStage();
                    }
                  }}
                />
                <button type="button" className="btn-secondary py-2" onClick={addStage}>
                  +
                </button>
              </div>
            </div>
          )}

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
