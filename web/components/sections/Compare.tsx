"use client";

import { comparison } from "@/lib/site";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";

const columns = ["Lumen", "DIY tools", "Typical agency"] as const;

export function Compare() {
  return (
    <section id="compare" className="bg-paper-soft py-section">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">Why Lumen</span>
          </Reveal>
          <TextReveal
            as="h2"
            text="The difference is in the details."
            className="mt-5 text-display-lg text-ink"
          />
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-prose text-body-lg text-ink-muted">
              Built for you, optimised every month, priced without surprises.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-4xl border border-paper-edge bg-paper shadow-[0_30px_80px_-50px_rgba(10,10,10,0.4)]">
            {/* header */}
            <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] border-b border-paper-edge bg-paper-soft">
              <div className="px-5 py-5 text-sm font-medium text-ink-faint sm:px-7">
                Capability
              </div>
              {columns.map((c, i) => (
                <div
                  key={c}
                  className={`px-3 py-5 text-center text-sm font-semibold sm:px-5 ${
                    i === 0
                      ? "relative bg-ink text-paper"
                      : "text-ink-muted"
                  }`}
                >
                  {c}
                  {i === 0 && (
                    <span className="absolute -top-px left-1/2 hidden -translate-x-1/2 rounded-b-md bg-ink px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper sm:block">
                      Recommended
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* rows */}
            <Stagger gap={0.05}>
              {comparison.map((row) => (
                <StaggerItem key={row.feature}>
                  <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] items-center border-b border-paper-edge/70 last:border-0">
                    <div className="px-5 py-5 text-sm font-medium text-ink sm:px-7">
                      {row.feature}
                    </div>
                    <Cell value={row.lumen} highlight />
                    <Cell value={row.diy} />
                    <Cell value={row.agency} />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Cell({
  value,
  highlight = false,
}: {
  value: string;
  highlight?: boolean;
}) {
  const isPositive = value === "Included" || value === "Native" || value === "Always" || value === "Yes" || value === "Hands-on";
  const isNegative = value === "—";

  return (
    <div
      className={`flex h-full items-center justify-center px-3 py-5 text-center text-sm sm:px-5 ${
        highlight ? "bg-ink/[0.02] font-medium text-ink" : "text-ink-muted"
      }`}
    >
      {isNegative ? (
        <span className="text-ink-faint/50" aria-label="Not available">
          —
        </span>
      ) : isPositive && highlight ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ink text-paper">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          {value}
        </span>
      ) : (
        value
      )}
    </div>
  );
}
