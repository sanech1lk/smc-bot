# Lumen — Premium Landing Page

A production-ready, Awwwards-grade landing page for **Lumen**, a fictional AI
automation agency for local businesses. Built to feel like a high-end
technology brand: ultra-clean minimalism, massive whitespace, cinematic
scroll-driven storytelling, and 60 FPS motion.

> Original work. No third-party branding, trademarks, copy, or imagery.

## Tech stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS** with a custom luxury type & spacing scale
- **Framer Motion** — reveals, parallax, micro-interactions
- **GSAP + ScrollTrigger** — pinned, scroll-driven storytelling
- **Lenis** — buttery smooth scrolling, synced to the GSAP ticker

## Getting started

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

Build for production:

```bash
npm run build
npm run start
```

## Structure

```
web/
├── app/
│   ├── layout.tsx          # fonts, SEO metadata, JSON-LD, skip link
│   ├── page.tsx            # section composition
│   ├── globals.css         # design tokens, glass, buttons, reduced-motion
│   ├── sitemap.ts / robots.ts / manifest.ts
├── components/
│   ├── providers/SmoothScroll.tsx   # Lenis ⇆ GSAP ticker
│   ├── sections/           # Navbar, Hero, Stats, Story, Showcase,
│   │                       # Compare, Testimonials, Faq, Cta, Footer
│   └── ui/                 # Reveal, TextReveal, Logo, ScrollProgress
└── lib/site.ts             # all copy & data in one place
```

## Design system

- **Color**: white paper background, black ink typography, soft gray accents
- **Type**: Inter (UI) + Instrument Serif (editorial accents), fluid `clamp()` scale
- **Motion**: a single `cubic-bezier(0.16, 1, 0.3, 1)` easing throughout
- **Spacing**: fluid `section` / `gutter` tokens for consistent rhythm

## Accessibility & performance

- Semantic landmarks, `aria` states on interactive elements, visible focus rings
- "Skip to content" link and labelled navigation
- Full `prefers-reduced-motion` support (Lenis, GSAP, and Framer all opt out)
- `will-change` + transform-only animations for 60 FPS
- SEO: metadata, Open Graph/Twitter, sitemap, robots, structured data
```
