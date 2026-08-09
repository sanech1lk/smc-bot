import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const plan = await prisma.plan.findUnique({ where: { id: params.id } });
  if (!plan) return NextResponse.json({ error: "План не найден" }, { status: 404 });

  const access = await requireProjectRole(plan.projectId, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  await prisma.plan.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
