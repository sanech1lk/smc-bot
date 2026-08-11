import { NextResponse } from "next/server";
import { apiError, rateLimitedError } from "@/lib/api-error";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { acceptInvitation } from "@/lib/invitations";
import { issueEmailVerification } from "@/lib/email-verification";

const registerSchema = z.object({
  name: z.string().min(2, "Введите имя"),
  email: z.string().email("Некорректный email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  // Present when arriving from an invitation email or a scanned QR code.
  inviteToken: z.string().optional()
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60);
  if (!limit.ok) {
    return rateLimitedError("tooManyRegistrations", limit.retryAfterSeconds);
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError("emailAlreadyRegistered", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash },
    select: { id: true, name: true, email: true, phone: true }
  });

  // Invitations addressed to this email are deliberately NOT redeemed here:
  // anyone can type any address into the sign-up form, and honouring them now
  // would let a stranger walk into a project they were merely invited to by
  // name. They are redeemed in verifyEmailToken() once the address is proven.
  await issueEmailVerification(user.id, email, name).catch((cause) => {
    // A dead SMTP server must not block sign-up — the user can ask for a new
    // link from inside the app.
    console.error("Не удалось отправить письмо подтверждения:", cause);
  });

  // A QR/link invitation is different: holding the link is the proof, and the
  // foreman handed it over in person, so it is honoured immediately.
  let joinedFromToken = false;
  if (parsed.data.inviteToken) {
    const result = await acceptInvitation(parsed.data.inviteToken, user.id);
    joinedFromToken = result.ok;
  }

  return NextResponse.json(
    { user, joinedProjects: joinedFromToken ? 1 : 0, emailVerificationSent: true },
    { status: 201 }
  );
}
