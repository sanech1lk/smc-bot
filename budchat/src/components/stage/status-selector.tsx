"use client";

import { STAGE_STATUS_META } from "@/lib/stages";
import type { StageStatus } from "@/types/models";

const ORDER: StageStatus[] = ["NOT_STARTED", "IN_PROGRESS", "DONE", "PROBLEM"];

export function StatusSelector({
  value,
  onChange,
  disabled
}: {
  value: StageStatus;
  onChange: (status: StageStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2.5">
      {ORDER.map((status) => {
        const meta = STAGE_STATUS_META[status];
        const active = status === value;
        return (
          <button
            key={status}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`chip flex-shrink-0 py-2 transition-all disabled:opacity-60 ${
              active ? `${meta.chip} ring-2 ring-current/25 font-semibold` : "bg-bg-card text-text-secondary"
            }`}
            aria-pressed={active}
          >
            <span className={`status-dot ${meta.dot}`} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
