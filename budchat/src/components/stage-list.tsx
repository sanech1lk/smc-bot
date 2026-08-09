"use client";

import Link from "next/link";
import { StatusDot } from "@/components/status-dot";
import { STAGE_STATUS_META } from "@/lib/stages";
import type { StageSummary } from "@/types/models";

export function StageList({ projectId, stages }: { projectId: string; stages: StageSummary[] }) {
  return (
    <div className="space-y-2">
      {stages
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((stage) => (
          <Link
            key={stage.id}
            href={`/projects/${projectId}/stages/${stage.id}`}
            className="card flex items-center gap-3 active:scale-[0.99] transition"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-sm font-bold text-text-secondary">
              {stage.order + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg font-semibold">{stage.name}</span>
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <StatusDot status={stage.status} />
              {STAGE_STATUS_META[stage.status].label}
            </span>
            <span className="text-text-muted">›</span>
          </Link>
        ))}
    </div>
  );
}
