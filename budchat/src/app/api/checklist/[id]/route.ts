import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
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
  if (!user) return apiError("unauthorized", 401);

  const existing = await prisma.checklistItem.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("checklistItemNotFound", 404);

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  // Clients (customers) may only tick/untick items during acceptance, not rewrite the checklist text.
  if (membership.role === "CLIENT" && parsed.data.text !== undefined) {
    return apiError("insufficientRights", 403);
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
  if (!user) return apiError("unauthorized", 401);

  const existing = await prisma.checklistItem.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("checklistItemNotFound", 404);

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  await prisma.checklistItem.delete({ where: { id: params.id } });
  emitToStage(existing.stageId, "checklist:deleted", { id: existing.id });

  return NextResponse.json({ ok: true });
}
