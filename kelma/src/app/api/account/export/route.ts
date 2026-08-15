import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * GDPR data portability: everything the account owner contributed, in one
 * machine-readable file they can keep or hand to another service.
 *
 * Scoped to what this person created. Other people's messages and photos are
 * not theirs to take, even from a project they belong to.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const [profile, memberships, messages, photos, tasks, shifts, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    }),
    prisma.projectMember.findMany({
      where: { userId: user.id },
      select: { role: true, createdAt: true, project: { select: { name: true, address: true } } }
    }),
    prisma.message.findMany({
      where: { senderId: user.id },
      select: { content: true, type: true, createdAt: true, stage: { select: { name: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.photo.findMany({
      where: { uploadedById: user.id },
      select: {
        url: true,
        tag: true,
        description: true,
        lat: true,
        lng: true,
        createdAt: true,
        stage: { select: { name: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.task.findMany({
      where: { OR: [{ createdById: user.id }, { assigneeId: user.id }] },
      select: { title: true, status: true, deadline: true, createdAt: true }
    }),
    prisma.shift.findMany({
      where: { userId: user.id },
      select: { startedAt: true, endedAt: true, note: true },
      orderBy: { startedAt: "asc" }
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } })
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    memberships,
    messages,
    photos,
    tasks,
    shifts,
    settings
  };

  const filename = `kelma-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
