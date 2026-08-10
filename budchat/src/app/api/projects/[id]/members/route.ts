import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, requireProjectRole } from "@/lib/access";
import { InvitationStatus, ProjectRole } from "@prisma/client";
import { createToken, expiresInHours } from "@/lib/tokens";
import { appUrl, sendMail } from "@/lib/mailer";

const addMemberSchema = z.object({
  email: z.string().email("Некорректный email"),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.WORKER)
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const [members, invitations] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: params.id },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.invitation.findMany({
      where: { projectId: params.id, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true }
    })
  ]);

  return NextResponse.json({ members, invitations });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await req.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true, address: true }
  });
  if (!project) return NextResponse.json({ error: "Объект не найден" }, { status: 404 });

  const targetUser = await prisma.user.findUnique({ where: { email } });

  // Existing user: add them straight away.
  if (targetUser) {
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: params.id, userId: targetUser.id } }
    });
    if (existing) {
      return NextResponse.json({ error: "Пользователь уже добавлен в объект" }, { status: 409 });
    }

    const member = await prisma.projectMember.create({
      data: { projectId: params.id, userId: targetUser.id, role: parsed.data.role },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } }
    });

    await sendMail({
      to: email,
      subject: `BudChat — вас добавили на объект «${project.name}»`,
      text: [
        `Здравствуйте, ${targetUser.name}!`,
        "",
        `${user.name} добавил вас на объект «${project.name}» (${project.address}).`,
        "",
        `Открыть: ${appUrl(`/projects/${params.id}`)}`
      ].join("\n")
    }).catch((err) => console.error("Invite mail failed", err));

    return NextResponse.json({ member }, { status: 201 });
  }

  // Not registered yet: store a pending invitation that is redeemed on sign-up.
  const alreadyInvited = await prisma.invitation.findFirst({
    where: { projectId: params.id, email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }
  });
  if (alreadyInvited) {
    return NextResponse.json({ error: "Приглашение уже отправлено на этот email" }, { status: 409 });
  }

  const { token, tokenHash } = createToken();
  const invitation = await prisma.invitation.create({
    data: {
      projectId: params.id,
      email,
      role: parsed.data.role,
      tokenHash,
      invitedById: user.id,
      expiresAt: expiresInHours(24 * 14)
    },
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true }
  });

  const link = appUrl(`/register?invite=${token}&email=${encodeURIComponent(email)}`);
  await sendMail({
    to: email,
    subject: `BudChat — приглашение на объект «${project.name}»`,
    text: [
      "Здравствуйте!",
      "",
      `${user.name} приглашает вас на объект «${project.name}» (${project.address}) в BudChat —`,
      "мессенджере для строительных бригад.",
      "",
      "Зарегистрируйтесь по ссылке, и объект появится у вас автоматически:",
      "",
      link,
      "",
      "Ссылка действует 14 дней."
    ].join("\n")
  }).catch((err) => console.error("Invite mail failed", err));

  return NextResponse.json({ invitation, invited: true }, { status: 201 });
}
