"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";

export function Cta() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section id="cta" ref={ref} className="px-gutter py-section">
      <div className="relative mx-auto max-w-shell overflow-hidden rounded-5xl bg-ink px-6 py-24 text-center text-paper md:py-30">
        {/* ambient + grain */}
        <motion.div
          aria-hidden="true"
          style={reduce ? undefined : { y: glowY }}
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute left-1/2 top-0 h-[50vh] w-[80vh] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,0.12),transparent_70%)]" />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <Reveal>
            <span className="eyebrow !text-white/40">
              Ready when you are
            </span>
          </Reveal>
          <TextReveal
            as="h2"
            text="Let your business run itself."
            className="mx-auto mt-6 text-display-xl text-paper"
          />
          <Reveal delay={0.1}>
            <p className="mx-auto mt-7 max-w-xl text-balance text-body-xl text-white/60">
              Book a free discovery call. We&apos;ll map your busywork and show
              you exactly what Lumen would automate first.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="mailto:hello@lumenautomations.com"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-medium text-ink transition-all duration-500 ease-luxe hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(255,255,255,0.5)] active:scale-[0.98]"
              >
                Book a discovery call
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-500 ease-luxe group-hover:translate-x-0.5">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="#showcase"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 px-8 py-4 text-sm font-medium text-paper transition-all duration-500 ease-luxe hover:border-white/50 hover:bg-white/[0.04] active:scale-[0.98]"
              >
                Explore the platform
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mt-8 text-sm text-white/40">
              No commitment · 20 minutes · Live within 14 days
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
