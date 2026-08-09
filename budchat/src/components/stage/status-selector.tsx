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
    <div className="flex gap-2 overflow-x-auto px-4 pb-3">
      {ORDER.map((status) => {
        const meta = STAGE_STATUS_META[status];
        const active = status === value;
        return (
          <button
            key={status}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`chip flex-shrink-0 py-2 disabled:opacity-60 ${
              active ? `${meta.dot} text-black font-semibold` : "bg-bg-card text-text-secondary"
            }`}
          >
            <span className={`status-dot ${meta.dot} ${active ? "!bg-black/30" : ""}`} />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
