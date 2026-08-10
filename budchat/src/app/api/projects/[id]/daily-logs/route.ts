import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const upsertSchema = z.object({
  date: z.string().min(1),
  weather: z.string().max(60).optional(),
  temperature: z.number().int().min(-90).max(60).optional(),
  crewCount: z.number().int().min(0).max(999).optional(),
  workDone: z.string().min(1, "Опишите выполненные работы").max(4000),
  issues: z.string().max(4000).optional()
});

/** Normalises to midnight UTC so one calendar day maps to exactly one row. */
function toDateOnly(input: string): Date | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const logs = await prisma.dailyLog.findMany({
    where: { projectId: params.id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 60
  });

  return NextResponse.json({ logs });
}

/** Creates or replaces the report for a day — one report per project per day. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const date = toDateOnly(parsed.data.date);
  if (!date) return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });

  const data = {
    weather: parsed.data.weather,
    temperature: parsed.data.temperature,
    crewCount: parsed.data.crewCount,
    workDone: parsed.data.workDone,
    issues: parsed.data.issues,
    authorId: user.id
  };

  const log = await prisma.dailyLog.upsert({
    where: { projectId_date: { projectId: params.id, date } },
    update: data,
    create: { projectId: params.id, date, ...data },
    include: { author: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ log }, { status: 201 });
}
