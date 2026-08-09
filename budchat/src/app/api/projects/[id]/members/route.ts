import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

const addMemberSchema = z.object({
  email: z.string().email("Некорректный email"),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.WORKER)
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const members = await prisma.projectMember.findMany({
    where: { projectId: params.id },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ members });
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
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return NextResponse.json(
      { error: "Пользователь с таким email ещё не зарегистрирован в BudChat" },
      { status: 404 }
    );
  }

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

  return NextResponse.json({ member }, { status: 201 });
}
