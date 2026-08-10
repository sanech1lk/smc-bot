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

/** Compact circular progress — reads faster than a number on a busy card. */
function ProgressRing({ percent, size = 46 }: { percent: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <span className="relative flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-bg-elevated"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="stroke-brand transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular">{percent}%</span>
    </span>
  );
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const total = project.stages.length || 1;
  const doneCount = project.stages.filter((s) => s.status === "DONE").length;
  const problemCount = project.stages.filter((s) => s.status === "PROBLEM").length;
  const currentStage =
    project.stages.find((s) => s.status === "IN_PROGRESS") ??
    project.stages.find((s) => s.status !== "DONE");
  const percent = Math.round((doneCount / total) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card group block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <ProgressRing percent={percent} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.0625rem] font-bold leading-snug">{project.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
            <MapPin size={13} className="flex-shrink-0" />
            <span className="truncate">{project.address}</span>
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 pt-1">
          {problemCount > 0 && (
            <span className="chip bg-status-red/15 px-2 py-1 text-xs text-status-red">
              <AlertTriangle size={12} />
              {problemCount}
            </span>
          )}
          <ChevronRight
            size={17}
            className="text-text-muted transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-[3px]" role="img" aria-label={`Прогресс ${percent}%`}>
        {project.stages.map((stage) => (
          <span
            key={stage.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${STAGE_STATUS_META[stage.status].dot}`}
            title={`${stage.name}: ${STAGE_STATUS_META[stage.status].label}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-soft pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`chip py-1 text-xs ${PROJECT_STATUS_CHIP[project.status]}`}>
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
          <span className="min-w-0 truncate text-sm text-text-secondary">
            {currentStage ? currentStage.name : "Все этапы готовы"}
          </span>
        </div>
        <span className="flex flex-shrink-0 items-center gap-1.5 text-sm text-text-muted">
          <Users size={14} />
          {project.members.length}
        </span>
      </div>
    </Link>
  );
}
