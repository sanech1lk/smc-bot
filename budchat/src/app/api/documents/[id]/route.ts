import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Документ не найден" }, { status: 404 });

  const membership = await getMembership(document.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
