import { STAGE_STATUS_META } from "@/lib/stages";
import type { StageStatus } from "@prisma/client";

export function StatusDot({ status, className = "" }: { status: StageStatus; className?: string }) {
  const meta = STAGE_STATUS_META[status];
  return <span className={`status-dot ${meta.dot} ${className}`} aria-label={meta.label} />;
}

export function StatusChip({ status }: { status: StageStatus }) {
  const meta = STAGE_STATUS_META[status];
  return (
    <span className={`chip bg-bg-elevated ${meta.color}`}>
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
