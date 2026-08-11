import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A large, thumb-friendly on/off control — used throughout the settings
 * screen instead of checkboxes, which are too small to hit reliably with a
 * gloved finger.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name — required since the control carries no visible text. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "bg-brand" : "bg-bg-elevated"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition-transform duration-200 ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/** A settings row: label + description on the left, a control on the right. */
export function SettingRow({
  icon: Icon,
  title,
  description,
  control,
  onClick
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  control: ReactNode;
  /** Makes the whole row tappable (e.g. to open a sub-screen). */
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 py-3 text-left ${onClick ? "active:opacity-70" : ""}`}
    >
      {Icon && (
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-text-secondary">
          <Icon size={18} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary">{title}</p>
        {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </Wrapper>
  );
}

/** Bottom sheet on mobile, centred dialog on wider screens. Tap the backdrop to dismiss. */
export function Sheet({
  onClose,
  children,
  maxWidth = "max-w-md"
}: {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className={`animate-sheet w-full ${maxWidth} rounded-t-2xl border border-border bg-bg-card p-5 shadow-overlay sm:my-8 sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Groups related SettingRows under a section label, matching the card look. */
export function SettingSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <p className="label px-1">{title}</p>
      <div className="card divide-y divide-border">{children}</div>
    </section>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Placeholder rows that mirror the shape of the real content while it loads. */
export function SkeletonList({ rows = 4, height = "h-24" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height} rounded-2xl`} />
      ))}
    </div>
  );
}

export function SkeletonChat() {
  const widths = ["w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-3/5"];
  return (
    <div className="space-y-3 px-4 py-3" aria-hidden>
      {widths.map((w, i) => (
        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
          <Skeleton className={`h-14 ${w} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full rounded-xl" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card space-y-3" aria-hidden>
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-in flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated text-text-muted">
        <Icon size={30} strokeWidth={1.75} />
      </div>
      <p className="text-lg font-semibold text-text-primary">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-text-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="animate-in rounded-xl bg-status-red/10 px-4 py-2.5 text-sm text-status-red">{children}</p>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="animate-in rounded-xl bg-accent/10 px-4 py-2.5 text-sm text-accent">{children}</p>
  );
}

export function Logo({ size = 44, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-2xl font-bold text-white ${
        glow ? "brand-glow" : "shadow-card"
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        backgroundImage: "linear-gradient(135deg, rgb(var(--brand-light)), rgb(var(--brand)))"
      }}
      aria-hidden
    >
      Б
    </span>
  );
}

// Deterministic palette so a person keeps the same avatar colour everywhere.
const AVATAR_TONES = [
  "bg-[rgb(var(--accent))]",
  "bg-[rgb(var(--status-green))]",
  "bg-[rgb(var(--brand))]",
  "bg-[rgb(var(--status-yellow))]",
  "bg-violet-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-sky-500"
];

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({
  name,
  id,
  size = 40
}: {
  name: string;
  /** Stable seed for the colour — falls back to the name. */
  id?: string;
  size?: number;
}) {
  // Names often carry a parenthetical role ("Дмитрий (мастер)"). Dropping it
  // first keeps the avatar as "Д" rather than the misleading "ДМ" — and the
  // letters-only match avoids picking up the bracket itself.
  const initials = (name.replace(/\([^)]*\)/g, " ").match(/\p{L}+/gu) ?? [])
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${toneFor(
        id ?? name
      )}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
