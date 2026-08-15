import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const closeSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  note: z.string().max(300).optional()
});

/** Closes an open shift. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return apiError("shiftNotFound", 404);

  const membership = await getMembership(shift.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);
  // A shift belongs to the person who worked it; only they or an admin close it.
  if (shift.userId !== user.id && membership.role !== "ADMIN") {
    return apiError("insufficientRights", 403);
  }
  if (shift.endedAt) return apiError("shiftAlreadyClosed", 409);

  const body = await req.json().catch(() => ({}));
  const parsed = closeSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const updated = await prisma.shift.update({
    where: { id: params.id },
    data: {
      endedAt: new Date(),
      endLat: parsed.data.lat ?? null,
      endLng: parsed.data.lng ?? null,
      note: parsed.data.note ?? shift.note
    },
    include: { user: { select: { id: true, name: true } }, stage: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ shift: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return apiError("shiftNotFound", 404);

  const membership = await getMembership(shift.projectId, user.id);
  if (!membership || membership.role !== "ADMIN") {
    return apiError("insufficientRights", 403);
  }

  await prisma.shift.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
