"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { faqs } from "@/lib/site";
import { Reveal } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-paper-soft py-section">
      <div className="shell grid gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
        <div className="md:sticky md:top-28 md:self-start">
          <Reveal>
            <span className="eyebrow">Questions</span>
          </Reveal>
          <TextReveal
            as="h2"
            text="Everything you were about to ask."
            className="mt-5 text-display-md text-ink"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-sm text-body-lg text-ink-muted">
              Still curious? A 20-minute discovery call answers the rest — no
              pressure, no script.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <a href="#cta" className="btn-ghost mt-8">
              Talk to us
            </a>
          </Reveal>
        </div>

        <div>
          <ul className="divide-y divide-paper-edge border-y border-paper-edge">
            {faqs.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-display-sm font-medium text-ink">
                      {item.q}
                    </span>
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 transition-all duration-500 ease-luxe ${
                        isOpen ? "rotate-45 bg-ink text-paper" : "text-ink"
                      }`}
                      aria-hidden="true"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-prose pb-7 text-body-lg text-ink-muted">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
