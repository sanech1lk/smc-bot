import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const visit = await prisma.visit.findUnique({ where: { id: params.id } });
  if (!visit) return apiError("visitNotFound", 404);

  const access = await requireProjectRole(visit.projectId, user.id, [
    ProjectRole.ADMIN,
    ProjectRole.WORKER
  ]);
  if (!access.ok) return apiError(access.code, access.status);

  await prisma.visit.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
