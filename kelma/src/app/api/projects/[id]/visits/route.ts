import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole, getMembership } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

const createVisitSchema = z.object({
  date: z.string().datetime().or(z.string().min(1)),
  stageId: z.string().optional(),
  crewName: z.string().optional(),
  note: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const membership = await getMembership(params.id, user.id);
  if (!membership) return apiError("forbidden", 403);

  const visits = await prisma.visit.findMany({
    where: { projectId: params.id },
    include: { stage: { select: { id: true, name: true } } },
    orderBy: { date: "asc" }
  });

  return NextResponse.json({ visits });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN, ProjectRole.WORKER]);
  if (!access.ok) return apiError(access.code, access.status);

  const body = await req.json().catch(() => null);
  const parsed = createVisitSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  const visit = await prisma.visit.create({
    data: {
      projectId: params.id,
      stageId: parsed.data.stageId || null,
      date: new Date(parsed.data.date),
      crewName: parsed.data.crewName,
      note: parsed.data.note
    },
    include: { stage: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ visit }, { status: 201 });
}
