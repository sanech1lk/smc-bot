import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-xl bg-brand font-bold text-white shadow-card"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      Б
    </span>
  );
}
