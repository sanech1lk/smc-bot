import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

const reorderSchema = z.object({
  stageIds: z.array(z.string()).min(1)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.stage.findMany({
    where: { projectId: params.id },
    select: { id: true }
  });
  const existingIds = new Set(existing.map((s) => s.id));
  const requestedIds = parsed.data.stageIds;

  if (
    requestedIds.length !== existingIds.size ||
    !requestedIds.every((id) => existingIds.has(id))
  ) {
    return NextResponse.json(
      { error: "Список этапов должен содержать все этапы объекта без повторов" },
      { status: 400 }
    );
  }

  // Two-phase update: first push every row to a unique negative "parking"
  // order so the intermediate state can never collide with the unique
  // (projectId, order) constraint, then assign the final 0..n-1 order.
  await prisma.$transaction([
    ...requestedIds.map((id, index) =>
      prisma.stage.update({ where: { id }, data: { order: -1 * (index + 1) } })
    ),
    ...requestedIds.map((id, index) => prisma.stage.update({ where: { id }, data: { order: index } }))
  ]);

  const stages = await prisma.stage.findMany({
    where: { projectId: params.id },
    orderBy: { order: "asc" }
  });

  return NextResponse.json({ stages });
}
