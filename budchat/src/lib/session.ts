import { getServerSession } from "next-auth";
import * as Sentry from "@sentry/nextjs";
import { authOptions } from "@/lib/auth";
import { sentryEnabled } from "@/lib/sentry-options";

/**
 * Every protected route goes through here, which makes it the one place worth
 * tagging errors with who was signed in. Only the id travels — the scrubber
 * strips name, email and phone from the event regardless.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;

  if (sentryEnabled) {
    Sentry.setUser(user ? { id: user.id } : null);
  }

  return user;
}
