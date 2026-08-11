import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { InvitationStatus, ProjectRole } from "@prisma/client";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const invitation = await prisma.invitation.findUnique({ where: { id: params.id } });
  if (!invitation) return apiError("invitationNotFound", 404);

  const access = await requireProjectRole(invitation.projectId, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return apiError(access.code, access.status);

  await prisma.invitation.update({
    where: { id: params.id },
    data: { status: InvitationStatus.REVOKED }
  });

  return NextResponse.json({ ok: true });
}
