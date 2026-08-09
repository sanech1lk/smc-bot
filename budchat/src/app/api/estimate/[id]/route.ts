import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";

const updateSchema = z.object({
  itemName: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(20).optional(),
  quantity: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional()
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const existing = await prisma.estimate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const quantity = parsed.data.quantity ?? existing.quantity;
  const unitPrice = parsed.data.unitPrice ?? existing.unitPrice;
  const totalPrice = round2(quantity * unitPrice);

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.estimate.update({
      where: { id: params.id },
      data: {
        itemName: parsed.data.itemName ?? existing.itemName,
        unit: parsed.data.unit ?? existing.unit,
        quantity,
        unitPrice,
        totalPrice
      }
    });

    await tx.estimateHistory.create({
      data: {
        estimateId: updated.id,
        stageId: updated.stageId,
        changedById: user.id,
        itemName: updated.itemName,
        unit: updated.unit,
        quantity: updated.quantity,
        unitPrice: updated.unitPrice,
        totalPrice: updated.totalPrice,
        action: "updated"
      }
    });

    return updated;
  });

  emitToStage(item.stageId, "estimate:updated", item);

  return NextResponse.json({ item });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const existing = await prisma.estimate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });

  const stage = await prisma.stage.findUnique({ where: { id: existing.stageId }, select: { projectId: true } });
  const membership = await getMembership(stage!.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.estimateHistory.create({
      data: {
        estimateId: existing.id,
        stageId: existing.stageId,
        changedById: user.id,
        itemName: existing.itemName,
        unit: existing.unit,
        quantity: existing.quantity,
        unitPrice: existing.unitPrice,
        totalPrice: existing.totalPrice,
        action: "deleted"
      }
    });
    await tx.estimate.delete({ where: { id: params.id } });
  });

  emitToStage(existing.stageId, "estimate:deleted", { id: existing.id });

  return NextResponse.json({ ok: true });
}
