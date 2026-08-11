import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Новый пароль минимум 6 символов")
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Rate limited like the login form: this endpoint also reveals whether a
  // guessed password is correct, just from inside a session.
  const limit = rateLimit(`password-change:${user.id}:${clientIp(req)}`, 10, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  });
  if (!record) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return NextResponse.json({ error: "Текущий пароль неверный" }, { status: 403 });

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: "Новый пароль совпадает с текущим" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) }
    }),
    // Any reset link already sitting in a mailbox must stop working.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  ]);

  return NextResponse.json({ ok: true });
}
