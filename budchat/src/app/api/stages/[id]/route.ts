import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { StageStatus } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  status: z.nativeEnum(StageStatus).optional(),
  name: z.string().min(1).optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: {
      project: { select: { id: true, name: true, address: true } },
      _count: { select: { messages: true, photos: true, tasks: true } }
    }
  });
  if (!stage) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stage.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  return NextResponse.json({ stage, myRole: membership.role });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const stage = await prisma.stage.update({
    where: { id: params.id },
    data: parsed.data
  });

  emitToStage(stage.id, "stage:updated", stage);

  return NextResponse.json({ stage });
}
