import { NextResponse } from "next/server";
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
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ error: "Смена не найдена" }, { status: 404 });

  const membership = await getMembership(shift.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  // A shift belongs to the person who worked it; only they or an admin close it.
  if (shift.userId !== user.id && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  if (shift.endedAt) return NextResponse.json({ error: "Смена уже закрыта" }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const parsed = closeSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
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
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const shift = await prisma.shift.findUnique({ where: { id: params.id } });
  if (!shift) return NextResponse.json({ error: "Смена не найдена" }, { status: 404 });

  const membership = await getMembership(shift.projectId, user.id);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.shift.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
