import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";

const createSchema = z.object({
  text: z.string().min(1).max(300)
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const items = await prisma.checklistItem.findMany({
    where: { stageId: params.id },
    orderBy: { order: "asc" }
  });

  return NextResponse.json({ items });
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const count = await prisma.checklistItem.count({ where: { stageId: params.id } });

  const item = await prisma.checklistItem.create({
    data: { stageId: params.id, text: parsed.data.text, order: count }
  });

  emitToStage(params.id, "checklist:new", item);

  return NextResponse.json({ item }, { status: 201 });
}
