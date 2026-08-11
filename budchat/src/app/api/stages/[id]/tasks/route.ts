import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { TaskStatus } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";
import { sendPushToUsers } from "@/lib/push-server";

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().optional(),
  deadline: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const tasks = await prisma.task.findMany({
    where: { stageId: params.id },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } }
    },
    orderBy: [{ status: "asc" }, { deadline: "asc" }]
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  if (parsed.data.assigneeId) {
    const assigneeMembership = await getMembership(stageRef.projectId, parsed.data.assigneeId);
    if (!assigneeMembership) {
      return apiError("assigneeNotMember", 400);
    }
  }

  const task = await prisma.task.create({
    data: {
      stageId: params.id,
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId || null,
      createdById: user.id,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      status: TaskStatus.NEW
    },
    include: {
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } }
    }
  });

  emitToStage(params.id, "task:new", task);

  if (task.assigneeId) {
    sendPushToUsers(
      [task.assigneeId],
      {
        title: `Новая задача · ${stageRef.name}`,
        body: task.title,
        url: `/projects/${stageRef.projectId}/stages/${params.id}`,
        tag: `task-${task.id}`
      },
      user.id,
      "tasks"
    ).catch((err) => console.error("Push notify failed", err));
  }

  return NextResponse.json({ task }, { status: 201 });
}
