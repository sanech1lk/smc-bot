import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId, requireProjectRole } from "@/lib/access";
import { ProjectRole, StageStatus } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  status: z.nativeEnum(StageStatus).optional(),
  name: z.string().min(1).optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, address: true } },
      _count: { select: { messages: true, photos: true, tasks: true } }
    }
  });
  if (!stage) return apiError("stageNotFound", 404);

  const membership = await getMembership(stage.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  return NextResponse.json({ stage, myRole: membership.role });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const stage = await prisma.stage.update({
    where: { id: params.id },
    data: parsed.data
  });

  emitToStage(stage.id, "stage:updated", stage);

  return NextResponse.json({ stage });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const access = await requireProjectRole(stageRef.projectId, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return apiError(access.code, access.status);

  const remaining = await prisma.stage.count({ where: { projectId: stageRef.projectId } });
  if (remaining <= 1) {
    return apiError("lastStageLocked", 400);
  }

  await prisma.stage.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
