import { NextResponse } from "next/server";
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
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const items = await prisma.estimate.findMany({
    where: { stageId: params.id },
    orderBy: { createdAt: "asc" }
  });

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return NextResponse.json({ items, total });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
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
