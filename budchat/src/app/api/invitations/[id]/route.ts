import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { InvitationStatus, ProjectRole } from "@prisma/client";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const invitation = await prisma.invitation.findUnique({ where: { id: params.id } });
  if (!invitation) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });

  const access = await requireProjectRole(invitation.projectId, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  await prisma.invitation.update({
    where: { id: params.id },
    data: { status: InvitationStatus.REVOKED }
  });

  return NextResponse.json({ ok: true });
}
