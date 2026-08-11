import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";

const createSchema = z.object({
  itemName: z.string().min(1).max(200),
  unit: z.string().min(1).max(20),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const [items, project] = await Promise.all([
    prisma.estimate.findMany({ where: { stageId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.project.findUnique({ where: { id: stageRef.projectId }, select: { currency: true } })
  ]);

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return NextResponse.json({ items, total, currency: project?.currency ?? "RUB" });
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

  const totalPrice = round2(parsed.data.quantity * parsed.data.unitPrice);

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.estimate.create({
      data: {
        stageId: params.id,
        itemName: parsed.data.itemName,
        unit: parsed.data.unit,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        totalPrice
      }
    });

    await tx.estimateHistory.create({
      data: {
        estimateId: created.id,
        stageId: params.id,
        changedById: user.id,
        itemName: created.itemName,
        unit: created.unit,
        quantity: created.quantity,
        unitPrice: created.unitPrice,
        totalPrice: created.totalPrice,
        action: "created"
      }
    });

    return created;
  });

  emitToStage(params.id, "estimate:new", item);

  return NextResponse.json({ item }, { status: 201 });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
