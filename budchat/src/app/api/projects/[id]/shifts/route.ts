import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const startSchema = z.object({
  stageId: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  note: z.string().max(300).optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  // Workers only see their own hours; admins see the whole crew's timesheet.
  const scope = membership.role === "ADMIN" ? {} : { userId: user.id };

  const [shifts, open] = await Promise.all([
    prisma.shift.findMany({
      where: { projectId: params.id, ...scope },
      include: { user: { select: { id: true, name: true } }, stage: { select: { id: true, name: true } } },
      orderBy: { startedAt: "desc" },
      take: 100
    }),
    prisma.shift.findFirst({
      where: { projectId: params.id, userId: user.id, endedAt: null },
      include: { stage: { select: { id: true, name: true } } }
    })
  ]);

  return NextResponse.json({ shifts, openShift: open, canSeeAll: membership.role === "ADMIN" });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = startSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // One open shift at a time, otherwise the totals stop meaning anything.
  const existing = await prisma.shift.findFirst({
    where: { projectId: params.id, userId: user.id, endedAt: null }
  });
  if (existing) {
    return NextResponse.json({ error: "Смена уже открыта" }, { status: 409 });
  }

  const shift = await prisma.shift.create({
    data: {
      projectId: params.id,
      userId: user.id,
      stageId: parsed.data.stageId || null,
      startLat: parsed.data.lat ?? null,
      startLng: parsed.data.lng ?? null,
      note: parsed.data.note
    },
    include: { user: { select: { id: true, name: true } }, stage: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ shift }, { status: 201 });
}
