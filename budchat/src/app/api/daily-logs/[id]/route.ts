import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const log = await prisma.dailyLog.findUnique({ where: { id: params.id } });
  if (!log) return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });

  const membership = await getMembership(log.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.dailyLog.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
