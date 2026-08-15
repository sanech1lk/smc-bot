import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { apiError, rateLimitedError } from "@/lib/api-error";
import { rateLimit } from "@/lib/rate-limit";
import { issueEmailVerification } from "@/lib/email-verification";

/**
 * Requested from inside the app by someone who is already signed in, so the
 * address is taken from the session rather than the request body — otherwise
 * this would be an open relay for sending mail to arbitrary addresses.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const limit = rateLimit(`resend-verification:${user.id}`, 3, 60 * 60);
  if (!limit.ok) return rateLimitedError("tooManyAttempts", limit.retryAfterSeconds);

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, name: true, emailVerifiedAt: true }
  });
  if (!record) return apiError("userNotFound", 404);

  // Already confirmed — answer success rather than an error, the outcome the
  // caller wanted is already true.
  if (record.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  await issueEmailVerification(user.id, record.email, record.name);
  return NextResponse.json({ ok: true });
}
