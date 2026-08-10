import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { PhotoTag } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  tag: z.nativeEnum(PhotoTag).optional(),
  description: z.string().max(500).optional(),
  // Serialised freehand strokes drawn over the photo. Null clears the markup.
  annotations: z.string().max(200_000).nullable().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo) return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });

  const membership = await getMembership((await prisma.stage.findUnique({
    where: { id: photo.stageId },
    select: { projectId: true }
  }))!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const updated = await prisma.photo.update({
    where: { id: params.id },
    data: parsed.data,
    include: { uploadedBy: { select: { id: true, name: true } } }
  });

  emitToStage(updated.stageId, "photo:updated", updated);

  return NextResponse.json({ photo: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const photo = await prisma.photo.findUnique({ where: { id: params.id } });
  if (!photo) return NextResponse.json({ error: "Фото не найдено" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: photo.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.photo.delete({ where: { id: params.id } });
  emitToStage(photo.stageId, "photo:deleted", { id: photo.id });

  return NextResponse.json({ ok: true });
}
