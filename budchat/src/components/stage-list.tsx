"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { StatusDot } from "@/components/status-dot";
import { STAGE_STATUS_META } from "@/lib/stages";
import type { ProjectRole, StageSummary } from "@/types/models";

export function StageList({
  projectId,
  stages,
  myRole,
  onChange
}: {
  projectId: string;
  stages: StageSummary[];
  myRole: ProjectRole;
  onChange: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [busy, setBusy] = useState(false);
  const sorted = stages.slice().sort((a, b) => a.order - b.order);
  const canEdit = myRole === "ADMIN";

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const reordered = sorted.slice();
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setBusy(true);
    await fetch(`/api/projects/${projectId}/stages/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageIds: reordered.map((s) => s.id) })
    });
    setBusy(false);
    onChange();
  }

  async function removeStage(stageId: string) {
    if (!confirm("Удалить этап вместе со всем чатом, фото, задачами и сметой этого этапа?")) return;
    setBusy(true);
    const res = await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onChange();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Не удалось удалить этап");
    }
  }

  async function handleAddStage(e: FormEvent) {
    e.preventDefault();
    const name = newStageName.trim();
    if (!name) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    setBusy(false);
    if (res.ok) {
      setNewStageName("");
      onChange();
    }
  }

  return (
    <div className="space-y-2">
      {canEdit && (
        <button
          className="btn-ghost mb-1 w-full border border-border-soft py-2 text-base"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? "Готово" : "✎ Редактировать этапы"}
        </button>
      )}

      {sorted.map((stage, index) => {
        if (editMode) {
          return (
            <div key={stage.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-sm font-bold text-text-secondary">
                  {index + 1}
                </span>
                <StatusDot status={stage.status} />
                <span className="min-w-0 flex-1 truncate text-lg font-semibold">{stage.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  className="btn-secondary flex-1 py-2.5 text-base disabled:opacity-30"
                  aria-label="Переместить выше"
                >
                  ↑ Выше
                </button>
                <button
                  disabled={busy || index === sorted.length - 1}
                  onClick={() => move(index, 1)}
                  className="btn-secondary flex-1 py-2.5 text-base disabled:opacity-30"
                  aria-label="Переместить ниже"
                >
                  ↓ Ниже
                </button>
                <button
                  disabled={busy || sorted.length <= 1}
                  onClick={() => removeStage(stage.id)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-status-red disabled:opacity-30 active:bg-status-red/10"
                  aria-label="Удалить этап"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={stage.id}
            href={`/projects/${projectId}/stages/${stage.id}`}
            className="card flex items-center gap-3 active:scale-[0.99] transition"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-sm font-bold text-text-secondary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg font-semibold">{stage.name}</span>
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <StatusDot status={stage.status} />
              {STAGE_STATUS_META[stage.status].label}
            </span>
            <span className="text-text-muted">›</span>
          </Link>
        );
      })}

      {editMode && (
        <form onSubmit={handleAddStage} className="flex gap-2 pt-1">
          <input
            className="input"
            placeholder="Новый этап"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={busy}>
            + Добавить
          </button>
        </form>
      )}
    </div>
  );
}
