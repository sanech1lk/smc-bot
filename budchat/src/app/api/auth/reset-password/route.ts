import { NextResponse } from "next/server";
import { apiError, rateLimitedError } from "@/lib/api-error";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(10, "Некорректная ссылка"),
  password: z.string().min(6, "Пароль минимум 6 символов")
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`reset:${ip}`, 10, 15 * 60);
  if (!limit.ok) {
    return rateLimitedError("tooManyAttempts", limit.retryAfterSeconds);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return apiError("linkInvalidOrExpired", 400);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    // Signing out everywhere isn't possible with stateless JWTs, but any
    // other outstanding reset links must stop working immediately.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() }
    })
  ]);

  return NextResponse.json({ ok: true });
}
