import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { TaskStatus } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";
import { sendPushToUsers } from "@/lib/push-server";

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return apiError("taskNotFound", 404);

  const stage = await prisma.stage.findUnique({ where: { id: task.stageId }, select: { projectId: true, name: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  // Clients may only move a task's status (e.g. approve from "review"), not reassign or retitle it.
  if (membership.role === "CLIENT") {
    const allowedForClient = Object.keys(parsed.data).every((key) => key === "status");
    if (!allowedForClient) {
      return apiError("insufficientRights", 403);
    }
  }

  const { deadline, ...rest } = parsed.data;

  const task2 = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {})
    },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } }
    }
  });

  emitToStage(task2.stageId, "task:updated", task2);

  if (task2.assigneeId && task2.assigneeId !== task.assigneeId) {
    sendPushToUsers(
      [task2.assigneeId],
      {
        title: `Задача назначена · ${stage!.name}`,
        body: task2.title,
        url: `/projects/${stage!.projectId}/stages/${task2.stageId}`,
        tag: `task-${task2.id}`
      },
      user.id,
      "tasks"
    ).catch((err) => console.error("Push notify failed", err));
  }

  return NextResponse.json({ task: task2 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return apiError("taskNotFound", 404);

  const stage = await prisma.stage.findUnique({ where: { id: task.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  await prisma.task.delete({ where: { id: params.id } });
  emitToStage(task.stageId, "task:deleted", { id: task.id });

  return NextResponse.json({ ok: true });
}
