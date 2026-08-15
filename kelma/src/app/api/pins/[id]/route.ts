import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { PinStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.nativeEnum(PinStatus).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const pin = await prisma.planPin.findUnique({ where: { id: params.id }, include: { plan: true } });
  if (!pin) return apiError("pinNotFound", 404);

  const membership = await getMembership(pin.plan.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const updated = await prisma.planPin.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    }
  });

  return NextResponse.json({ pin: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const pin = await prisma.planPin.findUnique({ where: { id: params.id }, include: { plan: true } });
  if (!pin) return apiError("pinNotFound", 404);

  const membership = await getMembership(pin.plan.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  await prisma.planPin.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
