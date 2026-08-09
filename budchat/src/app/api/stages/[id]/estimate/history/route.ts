import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const history = await prisma.estimateHistory.findMany({
    where: { stageId: params.id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { changedAt: "desc" },
    take: 200
  });

  return NextResponse.json({ history });
}
