import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, rateLimitedError } from "@/lib/api-error";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyEmailToken } from "@/lib/email-verification";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  // Tokens are 32 random bytes, so this is about noise rather than guessing.
  const limit = rateLimit(`verify-email:${clientIp(req)}`, 20, 15 * 60);
  if (!limit.ok) return rateLimitedError("tooManyAttempts", limit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("validationFailed", 400);

  const result = await verifyEmailToken(parsed.data.token);
  if (!result.ok) return apiError("linkInvalidOrExpired", 400);

  return NextResponse.json({ ok: true, joinedProjects: result.joinedProjects });
}
