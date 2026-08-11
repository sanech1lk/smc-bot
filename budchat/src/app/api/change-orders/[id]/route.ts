import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { ChangeOrderStatus } from "@prisma/client";
import { sendPushToProjectMembers } from "@/lib/push-server";

const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  signatureData: z
    .string()
    .refine((v) => v.startsWith("data:image/png;base64,"), "Ожидается PNG data URL")
    .optional()
});

/**
 * The customer's decision on extra work. Approving is what turns a chat
 * agreement into a signed record, so only the CLIENT (or an admin acting on
 * their behalf) may decide, and the decision is final.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const order = await prisma.changeOrder.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Допработа не найдена" }, { status: 404 });

  const membership = await getMembership(order.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  if (membership.role === "WORKER") {
    return NextResponse.json({ error: "Решение принимает заказчик" }, { status: 403 });
  }
  if (order.status !== ChangeOrderStatus.PENDING) {
    return NextResponse.json({ error: "Решение уже принято" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  if (parsed.data.signatureData && parsed.data.signatureData.length > 2_000_000) {
    return NextResponse.json({ error: "Подпись слишком большая" }, { status: 400 });
  }

  const updated = await prisma.changeOrder.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status as ChangeOrderStatus,
      decidedById: user.id,
      decidedAt: new Date(),
      signatureData: parsed.data.status === "APPROVED" ? parsed.data.signatureData ?? null : null
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      decidedBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } }
    }
  });

  sendPushToProjectMembers(
    order.projectId,
    {
      title: `Допработа №${updated.number} — ${parsed.data.status === "APPROVED" ? "согласована" : "отклонена"}`,
      body: updated.title,
      url: `/projects/${order.projectId}`,
      tag: `change-order-${updated.id}`
    },
    user.id,
    "changeOrders"
  ).catch((err) => console.error("Push notify failed", err));

  return NextResponse.json({ order: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const order = await prisma.changeOrder.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Допработа не найдена" }, { status: 404 });

  const membership = await getMembership(order.projectId, user.id);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  // A signed decision is the audit trail — it must not disappear.
  if (order.status !== ChangeOrderStatus.PENDING) {
    return NextResponse.json({ error: "Согласованную допработу удалить нельзя" }, { status: 409 });
  }

  await prisma.changeOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
