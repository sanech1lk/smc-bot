import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectRole } from "@prisma/client";
import { DEFAULT_STAGE_NAMES } from "@/lib/stages";
import { isSupportedCurrency } from "@/lib/currency";

const createProjectSchema = z.object({
  name: z.string().min(2, "Введите название объекта"),
  address: z.string().min(3, "Введите адрес"),
  currency: z.string().refine(isSupportedCurrency, "Валюта не поддерживается").optional(),
  stageNames: z.array(z.string().min(1).max(60)).min(1).max(30).optional()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

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
  if (!user) return apiError("unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const stageNames = parsed.data.stageNames?.length ? parsed.data.stageNames : DEFAULT_STAGE_NAMES;

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      currency: parsed.data.currency ?? "RUB",
      members: {
        create: { userId: user.id, role: ProjectRole.ADMIN }
      },
      stages: {
        create: stageNames.map((name, index) => ({ name, order: index }))
      }
    },
    include: {
      stages: { orderBy: { order: "asc" } },
      members: true
    }
  });

  return NextResponse.json({ project }, { status: 201 });
}
