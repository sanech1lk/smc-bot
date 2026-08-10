import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, requireProjectRole } from "@/lib/access";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { isSupportedCurrency } from "@/lib/currency";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(3).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  currency: z.string().refine(isSupportedCurrency, "Валюта не поддерживается").optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      stages: { orderBy: { order: "asc" } },
      members: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      visits: { orderBy: { date: "asc" } }
    }
  });

  if (!project) return NextResponse.json({ error: "Объект не найден" }, { status: 404 });

  return NextResponse.json({ project, myRole: membership.role });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: params.id },
    data: parsed.data
  });

  return NextResponse.json({ project });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  await prisma.project.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
