"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { showcases, type Showcase as ShowcaseType } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";

export function Showcase() {
  return (
    <section id="showcase" className="py-section">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">The platform</span>
          </Reveal>
          <TextReveal
            as="h2"
            text="Three systems. One quiet, relentless engine."
            className="mt-5 text-display-lg text-ink"
          />
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-prose text-body-lg text-ink-muted">
              Each one is built around your business and works in concert — the
              kind of operation that used to take a full team.
            </p>
          </Reveal>
        </div>

        <div className="mt-20 flex flex-col gap-24 md:mt-30 md:gap-section">
          {showcases.map((item, i) => (
            <ShowcaseRow key={item.id} item={item} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseRow({
  item,
  flip,
}: {
  item: ShowcaseType;
  flip: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 1.04]);
  const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 md:grid-cols-2 md:gap-16"
    >
      {/* copy */}
      <div className={flip ? "md:order-2" : ""}>
        <Reveal>
          <span className="eyebrow">{item.kicker}</span>
        </Reveal>
        <Reveal delay={0.05}>
          <h3 className="mt-4 max-w-md text-display-md text-ink">
            {item.title}
          </h3>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-md text-body-lg text-ink-muted">
            {item.description}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {item.bullets.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-2 rounded-full border border-paper-edge bg-paper-soft px-4 py-2 text-sm text-ink-soft"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                {b}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* visual */}
      <div className={flip ? "md:order-1" : ""}>
        <div className="overflow-hidden rounded-4xl">
          <motion.div
            style={reduce ? undefined : { scale, y }}
            className="will-change-transform"
          >
            <ShowcaseVisual item={item} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseVisual({ item }: { item: ShowcaseType }) {
  const dark = item.tone === "dark";
  return (
    <div
      className={`relative aspect-[4/3] w-full overflow-hidden rounded-4xl border p-7 ${
        dark
          ? "border-white/10 bg-ink text-paper"
          : "border-paper-edge bg-paper-mist text-ink"
      }`}
    >
      {/* abstract composition unique per tone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
        style={{
          background: dark
            ? "radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)"
            : "radial-gradient(circle, rgba(10,10,10,0.06), transparent 70%)",
        }}
      />
      <span
        className={`text-xs font-medium ${
          dark ? "text-white/50" : "text-ink-faint"
        }`}
      >
        {item.kicker}
      </span>

      <div className="absolute inset-x-7 bottom-7 space-y-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className={`flex items-center justify-between rounded-2xl px-4 py-3.5 ${
              dark ? "bg-white/[0.06]" : "bg-paper"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  dark ? "bg-white text-ink" : "bg-ink text-paper"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7.5L6 10.5l5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span
                className={`h-2.5 rounded-full ${
                  dark ? "bg-white/20" : "bg-paper-edge"
                }`}
                style={{ width: `${120 - row * 18}px` }}
              />
            </div>
            <span
              className={`h-2.5 w-10 rounded-full ${
                dark ? "bg-white/15" : "bg-paper-edge"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
