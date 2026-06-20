"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { story } from "@/lib/site";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function Story() {
  const root = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const chapters = gsap.utils.toArray<HTMLElement>(".story-chapter");
      const progressBar = root.current?.querySelector(".story-progress-fill");

      if (prefersReduced) {
        gsap.set(chapters, { opacity: 1, y: 0 });
        return;
      }

      // Initial state
      chapters.forEach((c, i) =>
        gsap.set(c, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 40 })
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top",
          end: () => `+=${chapters.length * 100}%`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
        },
      });

      if (progressBar) {
        tl.fromTo(
          progressBar,
          { scaleX: 0 },
          { scaleX: 1, ease: "none" },
          0
        );
      }

      chapters.forEach((chapter, i) => {
        if (i === 0) return;
        const prev = chapters[i - 1];
        tl.to(prev, { autoAlpha: 0, y: -40, duration: 0.5 }, i - 0.5);
        tl.fromTo(
          chapter,
          { autoAlpha: 0, y: 40 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          i - 0.5
        );
      });
    },
    { scope: root }
  );

  return (
    <section
      id="platform"
      ref={root}
      className="relative bg-ink text-paper"
      aria-label="How Lumen works"
    >
      <div
        ref={pinRef}
        className="relative flex min-h-[100svh] items-center overflow-hidden"
      >
        {/* progress bar */}
        <div className="absolute left-0 right-0 top-0 z-20 h-px bg-white/10">
          <div className="story-progress-fill h-full origin-left scale-x-0 bg-white" />
        </div>

        {/* ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)]"
        />

        <div className="shell grid w-full items-center gap-12 py-24 md:grid-cols-[1.1fr_0.9fr]">
          {/* left: stacked chapters */}
          <div className="relative min-h-[20rem]">
            {story.map((c, i) => (
              <div
                key={c.index}
                className={`story-chapter ${
                  i === 0 ? "relative" : "absolute inset-0"
                } flex flex-col justify-center`}
              >
                <span className="eyebrow !text-white/40">
                  Chapter {c.index}
                </span>
                <h2 className="mt-5 max-w-xl text-display-lg text-paper">
                  {c.title}
                </h2>
                <p className="mt-6 max-w-md text-body-lg text-white/55">
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          {/* right: big metric, also chaptered */}
          <div className="relative min-h-[14rem] md:min-h-[20rem]">
            {story.map((c, i) => (
              <div
                key={c.index}
                className={`story-chapter ${
                  i === 0 ? "relative" : "absolute inset-0"
                } flex flex-col items-start justify-center md:items-end md:text-right`}
              >
                <span className="block text-[clamp(4.5rem,16vw,11rem)] font-semibold leading-none tracking-tighter text-paper">
                  {c.metric}
                </span>
                <span className="mt-3 text-sm uppercase tracking-[0.16em] text-white/40">
                  {c.metricLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
