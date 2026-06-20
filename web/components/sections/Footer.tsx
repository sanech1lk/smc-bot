import { Logo } from "@/components/ui/Logo";
import { site, nav } from "@/lib/site";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Voice Agent", href: "#showcase" },
      { label: "Lead Engine", href: "#showcase" },
      { label: "Back-Office AI", href: "#showcase" },
      { label: "Compare", href: "#compare" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Voices", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "mailto:hello@lumenautomations.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-paper-edge bg-paper-soft">
      <div className="shell py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,0.9fr)]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-body-lg text-ink-muted">
              {site.tagline} Built for the businesses that keep their
              neighbourhoods running.
            </p>
            <a
              href="mailto:hello@lumenautomations.com"
              className="link-underline mt-6 inline-block text-sm font-medium text-ink"
            >
              hello@lumenautomations.com
            </a>
          </div>

          {footerLinks.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
              <ul className="mt-5 space-y-3.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="hairline my-12" />

        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <p className="text-sm text-ink-faint">
            © {year} {site.name} Automations. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {nav.slice(0, 3).map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm text-ink-faint transition-colors hover:text-ink"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
