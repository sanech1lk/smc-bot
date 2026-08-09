import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { MessageType } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";
import { sendPushToProjectMembers } from "@/lib/push-server";

const createMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  fileUrl: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

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
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
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
    user.id
  ).catch((err) => console.error("Push notify failed", err));

  return NextResponse.json({ message }, { status: 201 });
}
