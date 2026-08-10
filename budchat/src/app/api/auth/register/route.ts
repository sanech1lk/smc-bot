import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { InvitationStatus } from "@prisma/client";
import { acceptInvitation } from "@/lib/invitations";

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
    return NextResponse.json(
      { error: "Слишком много регистраций с этого адреса. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }

  const { name, phone, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash },
    select: { id: true, name: true, email: true, phone: true }
  });

  // Someone may have been invited to projects before they had an account —
  // turn those pending invitations into real memberships on sign-up.
  const invitations = await prisma.invitation.findMany({
    where: { email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }
  });

  if (invitations.length > 0) {
    await prisma.$transaction([
      prisma.projectMember.createMany({
        data: invitations.map((inv) => ({
          projectId: inv.projectId,
          userId: user.id,
          role: inv.role
        })),
        skipDuplicates: true
      }),
      prisma.invitation.updateMany({
        where: { id: { in: invitations.map((i) => i.id) } },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() }
      })
    ]);
  }

  // A QR/link invitation carries no email, so it is redeemed by its token.
  let joinedFromToken = false;
  if (parsed.data.inviteToken) {
    const result = await acceptInvitation(parsed.data.inviteToken, user.id);
    joinedFromToken = result.ok;
  }

  return NextResponse.json(
    { user, joinedProjects: invitations.length + (joinedFromToken ? 1 : 0) },
    { status: 201 }
  );
}
