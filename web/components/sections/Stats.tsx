"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { stats } from "@/lib/site";

export function Stats() {
  return (
    <section className="border-y border-paper-edge bg-paper-soft py-16 md:py-22">
      <div className="shell">
        <p className="eyebrow mb-10 text-center">
          Trusted by the businesses that keep neighbourhoods running
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <Counter value={s.value} />
                <p className="mt-2 text-sm text-ink-muted">{s.label}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : startValue(value));

  useEffect(() => {
    if (!inView || reduce) {
      setDisplay(value);
      return;
    }
    const match = value.match(/^([\d.]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const decimals = (match[1].split(".")[1] || "").length;
    const duration = 1400;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = (target * eased).toFixed(decimals);
      setDisplay(`${current}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce]);

  return (
    <span
      ref={ref}
      className="text-display-md tabular-nums tracking-tight text-ink"
    >
      {display}
    </span>
  );
}

function startValue(value: string) {
  const match = value.match(/^([\d.]+)(.*)$/);
  if (!match) return value;
  const decimals = (match[1].split(".")[1] || "").length;
  return `${(0).toFixed(decimals)}${match[2]}`;
}
