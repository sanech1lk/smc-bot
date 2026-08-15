"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";

export function TopBar({
  title,
  subtitle,
  backHref,
  right,
  showAccountActions = false
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: ReactNode;
  /** Shows the theme switch and sign-out button (top-level screens only). */
  showAccountActions?: boolean;
}) {
  const { t } = useLocale();

  return (
    <header className="top-safe sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-card text-text-secondary transition-all hover:text-text-primary active:scale-95 active:bg-bg-elevated"
            aria-label={t("topBar.backLabel")}
          >
            <ArrowLeft size={20} strokeWidth={2.25} />
          </Link>
        ) : (
          <Logo />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.0625rem] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-text-secondary">{subtitle}</p>}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {right}
          {showAccountActions && (
            <>
              <Link
                href="/settings"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-bg-card text-text-secondary transition-all hover:text-text-primary active:scale-95 active:bg-bg-elevated"
                aria-label={t("topBar.settingsLabel")}
                title={t("topBar.settingsLabel")}
              >
                <Settings size={20} strokeWidth={2} />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-card text-text-secondary transition-all hover:text-status-red active:scale-95 active:bg-bg-elevated"
                aria-label={t("topBar.signOutLabel")}
                title={t("topBar.signOutLabel")}
              >
                <LogOut size={20} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
