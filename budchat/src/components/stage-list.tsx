"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusDot } from "@/components/status-dot";
import { STAGE_STATUS_KEY, STAGE_STATUS_META } from "@/lib/stages";
import { useLocale } from "@/components/locale-provider";
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
  const { t } = useLocale();
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
    if (!confirm(t("stageList.deleteConfirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onChange();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("stageList.deleteError"));
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
          className="btn-ghost mb-1 w-full border border-border py-2.5 text-sm"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? <Check size={17} /> : <Pencil size={16} />}
          {editMode ? t("stageList.editDone") : t("stageList.editStages")}
        </button>
      )}

      {sorted.map((stage, index) => {
        if (editMode) {
          return (
            <div key={stage.id} className="animate-in card space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-sm font-bold text-text-secondary">
                  {index + 1}
                </span>
                <StatusDot status={stage.status} />
                <span className="min-w-0 flex-1 truncate text-base font-semibold">{stage.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                  {t("stageList.moveUp")}
                </button>
                <button
                  disabled={busy || index === sorted.length - 1}
                  onClick={() => move(index, 1)}
                  className="btn-secondary flex-1 py-2.5 text-sm disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                  {t("stageList.moveDown")}
                </button>
                <button
                  disabled={busy || sorted.length <= 1}
                  onClick={() => removeStage(stage.id)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-text-muted transition-colors hover:text-status-red disabled:opacity-30"
                  aria-label={t("stageList.deleteStageAria", { name: stage.name })}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={stage.id}
            href={`/projects/${projectId}/stages/${stage.id}`}
            className="card group flex items-center gap-3 transition-all duration-150 hover:border-border-soft active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-sm font-bold text-text-secondary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-base font-semibold">{stage.name}</span>
            <span className={`chip flex-shrink-0 py-1 text-xs ${STAGE_STATUS_META[stage.status].chip}`}>
              <StatusDot status={stage.status} />
              <span className="hidden xs:inline">{t(STAGE_STATUS_KEY[stage.status])}</span>
            </span>
            <ChevronRight
              size={18}
              className="flex-shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        );
      })}

      {editMode && (
        <form onSubmit={handleAddStage} className="animate-in flex gap-2 pt-1">
          <input
            className="input"
            placeholder={t("stageList.newStagePlaceholder")}
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
          />
          <button type="submit" className="btn-secondary px-4" disabled={busy}>
            <Plus size={18} />
          </button>
        </form>
      )}
    </div>
  );
}
