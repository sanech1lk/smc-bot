import { STAGE_STATUS_META } from "@/lib/stages";
import type { StageStatus } from "@prisma/client";

export function StatusDot({ status, className = "" }: { status: StageStatus; className?: string }) {
  const meta = STAGE_STATUS_META[status];
  // The active stage gets a soft halo so it stands out at a glance.
  const glow = status === "IN_PROGRESS" ? "dot-glow" : "";
  return <span className={`status-dot ${meta.dot} ${glow} ${className}`} aria-label={meta.label} />;
}

export function StatusChip({ status }: { status: StageStatus }) {
  const meta = STAGE_STATUS_META[status];
  return (
    <span className={`chip ${meta.chip}`}>
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
