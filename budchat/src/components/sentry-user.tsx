"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";
import { sentryEnabled } from "@/lib/sentry-options";

/**
 * Tags browser errors with the signed-in user's id, which turns "something
 * broke somewhere" into "this happens to this account" — the difference
 * between a reproducible bug and a guess.
 *
 * Only the id is sent. Name, email and phone are deliberately left out, and
 * the scrubber drops them again server-side even if something else adds them.
 */
export function SentryUser() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!sentryEnabled || status === "loading") return;

    const id = session?.user?.id;
    Sentry.setUser(id ? { id } : null);
  }, [session, status]);

  return null;
}
