import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { PunchStatus } from "@prisma/client";

const updateSchema = z.object({
  status: z.nativeEnum(PunchStatus).optional(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const item = await prisma.punchItem.findUnique({ where: { id: params.id } });
  if (!item) return apiError("punchNotFound", 404);

  const membership = await getMembership(item.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  // Only the customer signs a defect off as VERIFIED — that is the whole point
  // of the status; the contractor can go no further than FIXED.
  if (parsed.data.status === PunchStatus.VERIFIED && membership.role === "WORKER") {
    return apiError("verifyClientOrAdminOnly", 403);
  }
  if (membership.role === "CLIENT") {
    const onlyStatus = Object.keys(parsed.data).every((k) => k === "status");
    if (!onlyStatus) return apiError("insufficientRights", 403);
  }

  const { dueDate, ...rest } = parsed.data;

  const updated = await prisma.punchItem.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {})
    },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    }
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const item = await prisma.punchItem.findUnique({ where: { id: params.id } });
  if (!item) return apiError("punchNotFound", 404);

  const membership = await getMembership(item.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  await prisma.punchItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
