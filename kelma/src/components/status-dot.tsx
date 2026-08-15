"use client";

import { STAGE_STATUS_KEY, STAGE_STATUS_META } from "@/lib/stages";
import { useLocale } from "@/components/locale-provider";
import type { StageStatus } from "@prisma/client";

export function StatusDot({ status, className = "" }: { status: StageStatus; className?: string }) {
  const { t } = useLocale();
  const meta = STAGE_STATUS_META[status];
  // The active stage gets a soft halo so it stands out at a glance.
  const glow = status === "IN_PROGRESS" ? "dot-glow" : "";
  return <span className={`status-dot ${meta.dot} ${glow} ${className}`} aria-label={t(STAGE_STATUS_KEY[status])} />;
}

export function StatusChip({ status }: { status: StageStatus }) {
  const { t } = useLocale();
  const meta = STAGE_STATUS_META[status];
  return (
    <span className={`chip ${meta.chip}`}>
      <StatusDot status={status} />
      {t(STAGE_STATUS_KEY[status])}
    </span>
  );
}
