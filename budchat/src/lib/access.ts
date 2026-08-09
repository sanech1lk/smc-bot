import { prisma } from "@/lib/prisma";
import type { ProjectRole } from "@prisma/client";

/** Returns the caller's membership row for a project, or null if not a member. */
export async function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  });
}

export async function requireProjectRole(
  projectId: string,
  userId: string,
  allowed: ProjectRole[]
) {
  const membership = await getMembership(projectId, userId);
  if (!membership) return { ok: false as const, status: 403, message: "Вы не участник объекта" };
  if (!allowed.includes(membership.role)) {
    return { ok: false as const, status: 403, message: "Недостаточно прав" };
  }
  return { ok: true as const, membership };
}

export async function getStageWithProjectId(stageId: string) {
  return prisma.stage.findUnique({
    where: { id: stageId },
    select: { id: true, projectId: true, name: true }
  });
}
