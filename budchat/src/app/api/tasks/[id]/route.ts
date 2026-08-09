import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { TaskStatus } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: task.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Clients may only move a task's status (e.g. approve from "review"), not reassign or retitle it.
  if (membership.role === "CLIENT") {
    const allowedForClient = Object.keys(parsed.data).every((key) => key === "status");
    if (!allowedForClient) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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

  return NextResponse.json({ task: task2 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: task.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });
  emitToStage(task.stageId, "task:deleted", { id: task.id });

  return NextResponse.json({ ok: true });
}
