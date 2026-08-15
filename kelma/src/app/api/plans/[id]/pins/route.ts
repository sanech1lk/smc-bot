import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const createPinSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  stageId: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { projectId: true } });
  if (!plan) return apiError("planNotFound", 404);

  const membership = await getMembership(plan.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const pins = await prisma.planPin.findMany({
    where: { planId: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ pins });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const plan = await prisma.plan.findUnique({ where: { id: params.id }, select: { projectId: true } });
  if (!plan) return apiError("planNotFound", 404);

  const membership = await getMembership(plan.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = createPinSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  if (parsed.data.stageId) {
    const stage = await prisma.stage.findUnique({ where: { id: parsed.data.stageId }, select: { projectId: true } });
    if (!stage || stage.projectId !== plan.projectId) {
      return apiError("stageNotInProject", 400);
    }
  }

  const pin = await prisma.planPin.create({
    data: {
      planId: params.id,
      x: parsed.data.x,
      y: parsed.data.y,
      title: parsed.data.title,
      description: parsed.data.description,
      stageId: parsed.data.stageId || null,
      createdById: user.id
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    }
  });

  return NextResponse.json({ pin }, { status: 201 });
}
