import { site } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="4.4" fill="currentColor" />
        <path
          d="M12 1.2v3.4M12 19.4v3.4M22.8 12h-3.4M4.6 12H1.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[1.05rem] font-semibold tracking-tight">
        {site.name}
      </span>
    </span>
  );
}
