import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  unit: z.string().min(1).max(20).optional(),
  quantityPlanned: z.number().nonnegative().optional(),
  quantityUsed: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  supplier: z.string().max(120).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const material = await prisma.material.findUnique({ where: { id: params.id } });
  if (!material) return apiError("materialNotFound", 404);

  const membership = await getMembership(material.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const updated = await prisma.material.update({
    where: { id: params.id },
    data: parsed.data,
    include: { stage: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ material: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const material = await prisma.material.findUnique({ where: { id: params.id } });
  if (!material) return apiError("materialNotFound", 404);

  const membership = await getMembership(material.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  await prisma.material.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
