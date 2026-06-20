"use client";

import { testimonials } from "@/lib/site";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { TextReveal } from "@/components/ui/TextReveal";

export function Testimonials() {
  return (
    <section id="testimonials" className="py-section">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">In their words</span>
          </Reveal>
          <TextReveal
            as="h2"
            text="Owners who got their time back."
            className="mt-5 text-display-lg text-ink"
          />
        </div>

        <Stagger
          gap={0.1}
          className="mt-16 grid gap-5 md:mt-20 md:grid-cols-2"
        >
          {testimonials.map((t, i) => (
            <StaggerItem key={t.name}>
              <figure
                className={`group flex h-full flex-col justify-between rounded-4xl border border-paper-edge p-8 transition-all duration-500 ease-luxe hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(10,10,10,0.35)] md:p-10 ${
                  i === 0 ? "bg-ink text-paper" : "bg-paper-soft"
                }`}
              >
                <blockquote
                  className={`text-display-sm font-normal tracking-tight ${
                    i === 0 ? "text-paper" : "text-ink"
                  }`}
                >
                  <span
                    className={`font-serif italic ${
                      i === 0 ? "text-white/90" : "text-ink"
                    }`}
                  >
                    “
                  </span>
                  {t.quote}
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                      i === 0
                        ? "bg-white text-ink"
                        : "bg-ink text-paper"
                    }`}
                    aria-hidden="true"
                  >
                    {t.initials}
                  </span>
                  <span>
                    <span
                      className={`block text-sm font-semibold ${
                        i === 0 ? "text-paper" : "text-ink"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span
                      className={`block text-sm ${
                        i === 0 ? "text-white/55" : "text-ink-muted"
                      }`}
                    >
                      {t.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
