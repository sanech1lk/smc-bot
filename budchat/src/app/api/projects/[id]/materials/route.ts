import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const createSchema = z.object({
  name: z.string().min(1, "Введите название материала").max(200),
  unit: z.string().min(1).max(20),
  quantityPlanned: z.number().nonnegative().default(0),
  quantityUsed: z.number().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  supplier: z.string().max(120).optional(),
  stageId: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const [materials, project] = await Promise.all([
    prisma.material.findMany({
      where: { projectId: params.id },
      include: { stage: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.project.findUnique({ where: { id: params.id }, select: { currency: true } })
  ]);

  const plannedCost = materials.reduce((s, m) => s + m.quantityPlanned * m.unitPrice, 0);
  const usedCost = materials.reduce((s, m) => s + m.quantityUsed * m.unitPrice, 0);

  return NextResponse.json({
    materials,
    plannedCost,
    usedCost,
    currency: project?.currency ?? "RUB",
    myRole: membership.role
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const material = await prisma.material.create({
    data: {
      projectId: params.id,
      stageId: parsed.data.stageId || null,
      name: parsed.data.name,
      unit: parsed.data.unit,
      quantityPlanned: parsed.data.quantityPlanned,
      quantityUsed: parsed.data.quantityUsed,
      unitPrice: parsed.data.unitPrice,
      supplier: parsed.data.supplier
    },
    include: { stage: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ material }, { status: 201 });
}
