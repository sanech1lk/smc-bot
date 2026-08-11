import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { revokeStageAccess } from "@/lib/socket-server";
import { ProjectRole } from "@prisma/client";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; memberId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return apiError(access.code, access.status);

  const member = await prisma.projectMember.findUnique({ where: { id: params.memberId } });
  if (!member || member.projectId !== params.id) {
    return apiError("memberNotFound", 404);
  }
  if (member.role === ProjectRole.ADMIN) {
    const adminCount = await prisma.projectMember.count({
      where: { projectId: params.id, role: ProjectRole.ADMIN }
    });
    if (adminCount <= 1) {
      return apiError("lastAdminLocked", 400);
    }
  }

  await prisma.projectMember.delete({ where: { id: params.memberId } });

  // Their REST access is gone with the row; this closes the live socket feed
  // in the same breath, instead of at their next page load.
  const stages = await prisma.stage.findMany({
    where: { projectId: params.id },
    select: { id: true }
  });
  revokeStageAccess(
    member.userId,
    stages.map((stage) => stage.id)
  );

  return NextResponse.json({ ok: true });
}
