import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

const createStageSchema = z.object({
  name: z.string().min(1, "Введите название этапа").max(60)
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await req.json().catch(() => null);
  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const last = await prisma.stage.findFirst({
    where: { projectId: params.id },
    orderBy: { order: "desc" },
    select: { order: true }
  });

  const stage = await prisma.stage.create({
    data: {
      projectId: params.id,
      name: parsed.data.name,
      order: (last?.order ?? -1) + 1
    }
  });

  return NextResponse.json({ stage }, { status: 201 });
}
