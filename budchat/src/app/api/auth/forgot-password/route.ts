import { NextResponse } from "next/server";
import { apiError, rateLimitedError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, expiresInHours } from "@/lib/tokens";
import { appUrl, sendMail } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email("Некорректный email") });

// Always answered with the same success payload so the endpoint can't be
// used to discover which email addresses have accounts.
const GENERIC_OK = { ok: true, message: "Если аккаунт существует, письмо отправлено" };

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60);
  if (!limit.ok) {
    return rateLimitedError("tooManyAttempts", limit.retryAfterSeconds);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return NextResponse.json(GENERIC_OK);

  // Invalidate any outstanding tokens so only the newest link works.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() }
  });

  const { token, tokenHash } = createToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: expiresInHours(1) }
  });

  const link = appUrl(`/reset-password?token=${token}`);
  await sendMail({
    to: email,
    subject: "BudChat — восстановление пароля",
    text: [
      `Здравствуйте, ${user.name}!`,
      "",
      "Вы запросили восстановление пароля в BudChat.",
      "Перейдите по ссылке, чтобы задать новый пароль (ссылка действует 1 час):",
      "",
      link,
      "",
      "Если вы не запрашивали восстановление — просто проигнорируйте это письмо."
    ].join("\n")
  });

  return NextResponse.json(GENERIC_OK);
}
