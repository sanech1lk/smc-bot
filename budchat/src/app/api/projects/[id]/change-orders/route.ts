import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { sendPushToProjectMembers } from "@/lib/push-server";

const createSchema = z.object({
  title: z.string().min(2, "Введите название допработы").max(200),
  description: z.string().max(2000).optional(),
  amount: z.number(),
  stageId: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const [orders, project] = await Promise.all([
    prisma.changeOrder.findMany({
      where: { projectId: params.id },
      include: {
        createdBy: { select: { id: true, name: true } },
        decidedBy: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } }
      },
      orderBy: { number: "desc" }
    }),
    prisma.project.findUnique({ where: { id: params.id }, select: { currency: true } })
  ]);

  const approvedTotal = orders
    .filter((o) => o.status === "APPROVED")
    .reduce((sum, o) => sum + o.amount, 0);

  return NextResponse.json({
    orders,
    approvedTotal,
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

  // Human-readable sequential number per project ("Доп №3").
  const last = await prisma.changeOrder.findFirst({
    where: { projectId: params.id },
    orderBy: { number: "desc" },
    select: { number: true }
  });

  const order = await prisma.changeOrder.create({
    data: {
      projectId: params.id,
      stageId: parsed.data.stageId || null,
      number: (last?.number ?? 0) + 1,
      title: parsed.data.title,
      description: parsed.data.description,
      amount: parsed.data.amount,
      createdById: user.id
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      decidedBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } }
    }
  });

  sendPushToProjectMembers(
    params.id,
    {
      title: `Допработа №${order.number} на согласование`,
      body: order.title,
      url: `/projects/${params.id}`,
      tag: `change-order-${order.id}`
    },
    user.id
  ).catch((err) => console.error("Push notify failed", err));

  return NextResponse.json({ order }, { status: 201 });
}
