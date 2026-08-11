import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { MessageType } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";
import { sendPushToProjectMembers } from "@/lib/push-server";
import { enforceRateLimit, MESSAGE_LIMIT } from "@/lib/rate-limit";

const createMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  fileUrl: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const take = 50;

  const messages = await prisma.message.findMany({
    where: { stageId: params.id },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  return NextResponse.json({ messages: messages.reverse(), hasMore: messages.length === take });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const limited = enforceRateLimit("message", user.id, MESSAGE_LIMIT);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const message = await prisma.message.create({
    data: {
      stageId: params.id,
      senderId: user.id,
      content: parsed.data.content,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl
    },
    include: { sender: { select: { id: true, name: true } } }
  });

  emitToStage(params.id, "message:new", message);

  sendPushToProjectMembers(
    stageRef.projectId,
    {
      title: `${message.sender.name} · ${stageRef.name}`,
      body: message.content,
      url: `/projects/${stageRef.projectId}/stages/${params.id}`,
      tag: `stage-${params.id}`
    },
    user.id,
    "messages"
  ).catch((err) => console.error("Push notify failed", err));

  return NextResponse.json({ message }, { status: 201 });
}
