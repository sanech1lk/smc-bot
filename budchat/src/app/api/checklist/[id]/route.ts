import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  checked: z.boolean().optional(),
  text: z.string().min(1).max(300).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const existing = await prisma.checklistItem.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Пункт не найден" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Clients (customers) may only tick/untick items during acceptance, not rewrite the checklist text.
  if (membership.role === "CLIENT" && parsed.data.text !== undefined) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const item = await prisma.checklistItem.update({
    where: { id: params.id },
    data: parsed.data
  });

  emitToStage(item.stageId, "checklist:updated", item);

  return NextResponse.json({ item });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const existing = await prisma.checklistItem.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Пункт не найден" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.checklistItem.delete({ where: { id: params.id } });
  emitToStage(existing.stageId, "checklist:deleted", { id: existing.id });

  return NextResponse.json({ ok: true });
}
