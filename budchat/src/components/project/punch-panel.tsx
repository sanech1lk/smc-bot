"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ClipboardCheck, Plus, Trash2, X } from "lucide-react";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";
import type {
  ProjectMemberSummary,
  ProjectRole,
  PunchItemSummary,
  PunchStatus,
  StageSummary
} from "@/types/models";

const STATUS_KEY: Record<PunchStatus, string> = {
  OPEN: "punchStatus.open",
  IN_PROGRESS: "punchStatus.inProgress",
  FIXED: "punchStatus.fixed",
  VERIFIED: "punchStatus.verified"
};

const STATUS_CHIP: Record<PunchStatus, string> = {
  OPEN: "bg-status-red/15 text-status-red",
  IN_PROGRESS: "bg-status-yellow/15 text-status-yellow",
  FIXED: "bg-accent/12 text-accent",
  VERIFIED: "bg-status-green/15 text-status-green"
};

const NEXT_STATUS: Record<PunchStatus, PunchStatus | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "FIXED",
  FIXED: "VERIFIED",
  VERIFIED: null
};

export function PunchPanel({
  projectId,
  stages,
  members,
  myRole
}: {
  projectId: string;
  stages: StageSummary[];
  members: ProjectMemberSummary[];
  myRole: ProjectRole;
}) {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<PunchItemSummary[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/punch`);
    setItems(res.ok ? (await res.json()).items : []);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance(item: PunchItemSummary) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    const res = await fetch(`/api/punch/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => prev?.map((i) => (i.id === item.id ? data.item : i)) ?? null);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(apiErrorMessage(t, data, "punch.errorAdvance"));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("punch.deleteConfirm"))) return;
    const res = await fetch(`/api/punch/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
  }

  if (items === null) return <SkeletonList rows={3} height="h-28" />;

  const open = items.filter((i) => i.status !== "VERIFIED");
  const verified = items.filter((i) => i.status === "VERIFIED");
  const visible = showDone ? verified : open;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setShowDone(false)}
          className={`chip flex-1 justify-center py-2 ${
            !showDone ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
          }`}
        >
          {t("punch.tabOpen", { count: open.length })}
        </button>
        <button
          onClick={() => setShowDone(true)}
          className={`chip flex-1 justify-center py-2 ${
            showDone ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
          }`}
        >
          {t("punch.tabVerified", { count: verified.length })}
        </button>
      </div>

      <button className="btn-secondary w-full" onClick={() => setFormOpen((v) => !v)}>
        {formOpen ? <X size={17} /> : <Plus size={17} />}
        {formOpen ? t("common.cancel") : t("punch.addCta")}
      </button>

      {formOpen && (
        <NewPunchForm
          projectId={projectId}
          stages={stages}
          members={members}
          onCreated={() => {
            setFormOpen(false);
            setShowDone(false);
            load();
          }}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={showDone ? t("punch.emptyTitleVerified") : t("punch.emptyTitleOpen")}
          description={showDone ? undefined : t("punch.emptyDescription")}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-start gap-3">
                {item.photo && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-bg-elevated">
                    <Image src={item.photo.url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <span className={`chip flex-shrink-0 py-1 text-xs ${STATUS_CHIP[item.status]}`}>
                      {t(STATUS_KEY[item.status])}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                    {item.stage && <span>{item.stage.name}</span>}
                    {item.assignee && <span>{item.assignee.name}</span>}
                    {item.dueDate && (
                      <span>
                        {t("punch.dueDatePrefix")}{" "}
                        {format(new Date(item.dueDate), "d MMM", { locale: dateFnsLocale(locale) })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {NEXT_STATUS[item.status] && (
                  <button className="btn-secondary flex-1 py-2 text-sm" onClick={() => advance(item)}>
                    {item.status === "FIXED"
                      ? t("punch.acceptFix")
                      : `→ ${t(STATUS_KEY[NEXT_STATUS[item.status]!])}`}
                  </button>
                )}
                {myRole !== "CLIENT" && (
                  <button
                    onClick={() => remove(item.id)}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-text-muted hover:text-status-red"
                    aria-label={t("punch.deleteAria")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewPunchForm({
  projectId,
  stages,
  members,
  onCreated
}: {
  projectId: string;
  stages: StageSummary[];
  members: ProjectMemberSummary[];
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stageId, setStageId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/punch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        stageId: stageId || undefined,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(t, data, "punch.errorCreate"));
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card space-y-3">
      <input
        className="input"
        placeholder={t("punch.titlePlaceholder")}
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input"
        rows={2}
        placeholder={t("punch.descriptionPlaceholder")}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
        <option value="">{t("punch.noStage")}</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
          <option value="">{t("punch.noAssignee")}</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user?.name}
            </option>
          ))}
        </select>
        <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? t("punch.submitCreating") : t("punch.submit")}
      </button>
    </form>
  );
}
