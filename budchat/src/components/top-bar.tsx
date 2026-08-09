"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import type { ReactNode } from "react";

export function TopBar({
  title,
  backHref,
  right
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <header className="top-safe sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur">
      {backHref ? (
        <Link
          href={backHref}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-bg-card text-xl active:bg-bg-elevated"
          aria-label="Назад"
        >
          ←
        </Link>
      ) : (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
          Б
        </div>
      )}
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h1>
      <div className="flex flex-shrink-0 items-center gap-2">
        {right}
        {!backHref && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-bg-card text-lg active:bg-bg-elevated"
            aria-label="Выйти"
            title="Выйти"
          >
            ⏻
          </button>
        )}
      </div>
    </header>
  );
}
