import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const member = await prisma.projectMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.projectId !== params.id) {
    return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
  }
  if (member.role === ProjectRole.ADMIN) {
    const adminCount = await prisma.projectMember.count({
      where: { projectId: params.id, role: ProjectRole.ADMIN }
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Нельзя удалить последнего администратора" }, { status: 400 });
    }
  }

  await prisma.projectMember.delete({ where: { id: params.memberId } });

  return NextResponse.json({ ok: true });
}
