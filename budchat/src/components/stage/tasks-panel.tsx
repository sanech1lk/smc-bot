"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useStageSocket } from "@/lib/use-stage-socket";
import { MicButton } from "@/components/mic-button";
import { CalendarClock, CheckSquare, Plus, User, X } from "lucide-react";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import type { ProjectMemberSummary, ProjectRole, TaskStatus, TaskSummary } from "@/types/models";

const STATUS_KEY: Record<TaskStatus, string> = {
  NEW: "taskStatus.new",
  IN_PROGRESS: "taskStatus.inProgress",
  REVIEW: "taskStatus.review",
  DONE: "taskStatus.done"
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  NEW: "bg-status-gray/20 text-text-secondary",
  IN_PROGRESS: "bg-status-yellow/20 text-status-yellow",
  REVIEW: "bg-brand/20 text-brand-light",
  DONE: "bg-status-green/20 text-status-green"
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  NEW: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW",
  REVIEW: "DONE",
  DONE: null
};

export function TasksPanel({
  stageId,
  members,
  myRole,
  compact = false
}: {
  stageId: string;
  members: ProjectMemberSummary[];
  myRole: ProjectRole;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const socket = useStageSocket(stageId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/stages/${stageId}/tasks`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setTasks(data.tasks);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  useEffect(() => {
    function onNew(task: TaskSummary) {
      setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [task, ...prev]));
    }
    function onUpdated(task: TaskSummary) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
    function onDeleted({ id }: { id: string }) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    socket.on("task:new", onNew);
    socket.on("task:updated", onUpdated);
    socket.on("task:deleted", onDeleted);
    return () => {
      socket.off("task:new", onNew);
      socket.off("task:updated", onUpdated);
      socket.off("task:deleted", onDeleted);
    };
  }, [socket]);

  async function advanceStatus(task: TaskSummary) {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    }
  }

  const canCreate = myRole !== "CLIENT";

  return (
    <div className={compact ? "" : "px-4 py-4 pb-24 lg:pb-6"}>
      {canCreate && (
        <button className="btn-secondary mb-3 w-full" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? t("common.cancel") : t("tasks.newTaskCta")}
        </button>
      )}

      {formOpen && (
        <NewTaskForm
          stageId={stageId}
          members={members}
          onCreated={(task) => {
            setTasks((prev) => [task, ...prev]);
            setFormOpen(false);
          }}
        />
      )}

      {loading && <SkeletonList rows={3} height="h-28" />}
      {!loading && tasks.length === 0 && (
        <EmptyState
          icon={CheckSquare}
          title={t("tasks.emptyTitle")}
          description={canCreate ? t("tasks.emptyDescription") : undefined}
        />
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{task.title}</p>
              <span className={`chip flex-shrink-0 text-xs ${STATUS_COLOR[task.status]}`}>
                {t(STATUS_KEY[task.status])}
              </span>
            </div>
            {task.description && <p className="mt-1 text-sm text-text-secondary">{task.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
              {task.assignee && (
                <span className="inline-flex items-center gap-1.5">
                  <User size={13} />
                  {task.assignee.name}
                </span>
              )}
              {task.deadline && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={13} />
                  {format(new Date(task.deadline), "dd.MM.yyyy")}
                </span>
              )}
            </div>
            {NEXT_STATUS[task.status] && (
              <button
                onClick={() => advanceStatus(task)}
                className="btn-secondary mt-3 w-full py-2 text-base"
              >
                {task.status === "REVIEW"
                  ? t("tasks.acceptWork")
                  : t("tasks.moveToStatus", { status: t(STATUS_KEY[NEXT_STATUS[task.status]!]) })}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewTaskForm({
  stageId,
  members,
  onCreated
}: {
  stageId: string;
  members: ProjectMemberSummary[];
  onCreated: (task: TaskSummary) => void;
}) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/stages/${stageId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        assigneeId: assigneeId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("tasks.errorCreate"));
      return;
    }

    const data = await res.json();
    onCreated(data.task);
    setTitle("");
    setAssigneeId("");
    setDeadline("");
    setDescription("");
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-3 space-y-3">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={t("tasks.titlePlaceholder")}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <MicButton onResult={(spoken) => setTitle((prev) => (prev ? `${prev} ${spoken}` : spoken))} />
      </div>
      <textarea
        className="input"
        placeholder={t("tasks.descriptionPlaceholder")}
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
        <option value="">{t("tasks.noAssignee")}</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.user?.name}
          </option>
        ))}
      </select>
      <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? t("tasks.submitCreating") : t("tasks.submitCreate")}
      </button>
    </form>
  );
}
