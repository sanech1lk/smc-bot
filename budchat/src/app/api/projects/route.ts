import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectRole } from "@prisma/client";
import { DEFAULT_STAGE_NAMES } from "@/lib/stages";

const createProjectSchema = z.object({
  name: z.string().min(2, "Введите название объекта"),
  address: z.string().min(3, "Введите адрес")
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      stages: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, status: true, order: true }
      },
      members: {
        select: { role: true, userId: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      members: {
        create: { userId: user.id, role: ProjectRole.ADMIN }
      },
      stages: {
        create: DEFAULT_STAGE_NAMES.map((name, index) => ({ name, order: index }))
      }
    },
    include: {
      stages: { orderBy: { order: "asc" } },
      members: true
    }
  });

  return NextResponse.json({ project }, { status: 201 });
}
