import Link from "next/link";
import { AlertTriangle, ChevronRight, MapPin, Users } from "lucide-react";
import type { ProjectSummary } from "@/types/models";
import { STAGE_STATUS_META } from "@/lib/stages";

const PROJECT_STATUS_LABEL: Record<ProjectSummary["status"], string> = {
  ACTIVE: "В работе",
  PAUSED: "Приостановлен",
  DONE: "Завершён",
  CANCELLED: "Отменён"
};

const PROJECT_STATUS_CHIP: Record<ProjectSummary["status"], string> = {
  ACTIVE: "bg-accent/12 text-accent",
  PAUSED: "bg-status-yellow/15 text-status-yellow",
  DONE: "bg-status-green/15 text-status-green",
  CANCELLED: "bg-status-gray/15 text-text-muted"
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const total = project.stages.length || 1;
  const doneCount = project.stages.filter((s) => s.status === "DONE").length;
  const problemCount = project.stages.filter((s) => s.status === "PROBLEM").length;
  const currentStage =
    project.stages.find((s) => s.status === "IN_PROGRESS") ??
    project.stages.find((s) => s.status !== "DONE");
  const progress = Math.round((doneCount / total) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card group block transition-all duration-150 hover:-translate-y-0.5 hover:shadow-raised active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold leading-snug">{project.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{project.address}</span>
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {problemCount > 0 && (
            <span className="chip bg-status-red/15 py-1 text-xs text-status-red">
              <AlertTriangle size={13} />
              {problemCount}
            </span>
          )}
          <ChevronRight
            size={18}
            className="text-text-muted transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1" role="img" aria-label={`Прогресс ${progress}%`}>
        {project.stages.map((stage) => (
          <span
            key={stage.id}
            className={`h-1.5 flex-1 rounded-full ${STAGE_STATUS_META[stage.status].dot}`}
            title={`${stage.name}: ${STAGE_STATUS_META[stage.status].label}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-text-secondary">
          {currentStage ? `Этап: ${currentStage.name}` : "Все этапы завершены"}
        </span>
        <span className="flex-shrink-0 text-sm font-semibold tabular-nums">
          {doneCount}/{total}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className={`chip py-1 text-xs ${PROJECT_STATUS_CHIP[project.status]}`}>
          {PROJECT_STATUS_LABEL[project.status]}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-text-muted">
          <Users size={14} />
          {project.members.length}
        </span>
      </div>
    </Link>
  );
}
