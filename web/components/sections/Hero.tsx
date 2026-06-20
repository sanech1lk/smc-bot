"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const visualY = useTransform(scrollYProgress, [0, 1], ["0%", "32%"]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden pt-28 md:pt-32"
    >
      {/* Ambient gradient field */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[18%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,10,10,0.05),transparent_70%)] blur-2xl" />
        <div className="absolute left-1/2 top-0 h-px w-px shadow-[0_0_400px_240px_rgba(10,10,10,0.04)]" />
      </div>

      <motion.div
        style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
        className="shell relative z-10 flex flex-col items-center text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="eyebrow mb-7 inline-flex items-center gap-2.5 rounded-full border border-paper-edge bg-paper-soft px-4 py-2"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
          AI automation, done for you
        </motion.span>

        <h1 className="text-display-2xl text-ink">
          <TextReveal as="h1" text="Your business," delay={0.25} className="block" />
          <span className="block">
            <TextReveal as="h1" text="running itself." delay={0.45} className="text-gradient inline-block" />
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}
          className="mx-auto mt-8 max-w-prose text-balance text-body-xl text-ink-muted"
        >
          Lumen builds custom AI that answers every call, books every
          appointment, and follows up with every lead — so you can focus on the
          work only you can do.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 1.05 }}
          className="mt-11 flex flex-col items-center gap-3 sm:flex-row"
        >
          <a href="#cta" className="btn-primary">
            Book a discovery call
          </a>
          <a href="#platform" className="btn-ghost">
            See how it works
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 12L12 4M12 4H6M12 4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>
      </motion.div>

      {/* Cinematic product visual */}
      <motion.div
        style={reduce ? undefined : { y: visualY, scale: visualScale }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
        className="relative z-0 mt-16 w-full max-w-4xl px-gutter md:mt-20"
      >
        <HeroPanel />
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-ink/20 p-1.5">
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="h-1.5 w-1 rounded-full bg-ink/50"
          />
        </div>
      </motion.div>
    </section>
  );
}

/** Stylised "dashboard" panel — abstract, original, no third-party marks. */
function HeroPanel() {
  return (
    <div className="perspective">
      <div className="glass overflow-hidden rounded-4xl p-2 shadow-[0_50px_120px_-40px_rgba(10,10,10,0.35)]">
        <div className="rounded-[1.6rem] bg-paper-soft p-5 sm:p-7">
          {/* window chrome */}
          <div className="mb-6 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-paper-edge" />
            <span className="h-2.5 w-2.5 rounded-full bg-paper-edge" />
            <span className="h-2.5 w-2.5 rounded-full bg-paper-edge" />
            <span className="ml-3 text-xs font-medium text-ink-faint">
              Lumen · Live activity
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { k: "Calls answered today", v: "47", d: "+12 vs yesterday" },
              { k: "Appointments booked", v: "19", d: "all confirmed" },
              { k: "Leads followed up", v: "63", d: "0 missed" },
            ].map((c) => (
              <div
                key={c.k}
                className="rounded-2xl border border-paper-edge bg-paper p-4 text-left"
              >
                <p className="text-xs text-ink-faint">{c.k}</p>
                <p className="mt-2 text-display-sm tabular-nums text-ink">
                  {c.v}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{c.d}</p>
              </div>
            ))}
          </div>

          {/* fake live transcript */}
          <div className="mt-4 rounded-2xl border border-paper-edge bg-paper p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-muted">
                Incoming call · transcript
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
                live
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              <Bubble side="left" w="68%" />
              <Bubble side="right" w="52%" />
              <Bubble side="left" w="80%" />
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <FloatingChip
        className="-left-3 top-10 sm:-left-8"
        label="Booked: Tue 2:30pm"
      />
      <FloatingChip
        className="-right-3 bottom-12 sm:-right-8"
        label="Lead won · $3,200"
        delay={1.2}
      />
    </div>
  );
}

function Bubble({ side, w }: { side: "left" | "right"; w: string }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`h-6 rounded-full ${
          side === "right" ? "bg-ink/90" : "bg-paper-mist"
        }`}
        style={{ width: w }}
      />
    </div>
  );
}

function FloatingChip({
  className = "",
  label,
  delay = 0,
}: {
  className?: string;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2 + delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute hidden md:block ${className}`}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: "easeInOut",
          delay,
        }}
        className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium text-ink shadow-lg"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {label}
      </motion.div>
    </motion.div>
  );
}
