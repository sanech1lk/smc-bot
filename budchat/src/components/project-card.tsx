import Link from "next/link";
import type { ProjectSummary } from "@/types/models";
import { STAGE_STATUS_META } from "@/lib/stages";

const PROJECT_STATUS_LABEL: Record<ProjectSummary["status"], string> = {
  ACTIVE: "В работе",
  PAUSED: "Приостановлен",
  DONE: "Завершён",
  CANCELLED: "Отменён"
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const total = project.stages.length || 1;
  const doneCount = project.stages.filter((s) => s.status === "DONE").length;
  const problemCount = project.stages.filter((s) => s.status === "PROBLEM").length;
  const currentStage = project.stages.find((s) => s.status === "IN_PROGRESS") ?? project.stages.find((s) => s.status !== "DONE");

  return (
    <Link href={`/projects/${project.id}`} className="card block active:scale-[0.99] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{project.name}</h3>
          <p className="mt-0.5 truncate text-text-secondary">{project.address}</p>
        </div>
        {problemCount > 0 && (
          <span className="chip flex-shrink-0 bg-status-red/15 text-status-red">
            ⚠ {problemCount}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {project.stages.map((stage) => (
          <span
            key={stage.id}
            className={`h-2 flex-1 rounded-full ${STAGE_STATUS_META[stage.status].dot}`}
            title={stage.name}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {currentStage ? `Этап: ${currentStage.name}` : "Все этапы завершены"}
        </span>
        <span className="font-semibold text-text-primary">
          {doneCount}/{total}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="chip bg-bg-elevated text-text-secondary">{PROJECT_STATUS_LABEL[project.status]}</span>
        <span className="text-text-muted">{project.members.length} участников</span>
      </div>
    </Link>
  );
}
