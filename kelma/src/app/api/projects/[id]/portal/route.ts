import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { ChangeOrderStatus, PunchStatus } from "@prisma/client";

/**
 * Curated, read-mostly view for the customer: progress, recent photos, money
 * agreed so far and anything waiting on their decision — without exposing the
 * crew's internal timesheets or the full task board.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const membership = await getMembership(params.id, user.id);
  if (!membership) return apiError("forbidden", 403);

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      address: true,
      status: true,
      currency: true,
      stages: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true, status: true }
      }
    }
  });
  if (!project) return apiError("projectNotFound", 404);

  const stageIds = project.stages.map((s) => s.id);

  const [photos, estimateItems, changeOrders, openPunch, lastLog, nextVisit] = await Promise.all([
    prisma.photo.findMany({
      where: { stageId: { in: stageIds } },
      select: { id: true, url: true, tag: true, createdAt: true, stage: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.estimate.findMany({
      where: { stageId: { in: stageIds } },
      select: { totalPrice: true }
    }),
    prisma.changeOrder.findMany({
      where: { projectId: params.id },
      include: { createdBy: { select: { name: true } }, stage: { select: { name: true } } },
      orderBy: { number: "desc" }
    }),
    prisma.punchItem.count({
      where: { projectId: params.id, status: { in: [PunchStatus.OPEN, PunchStatus.IN_PROGRESS, PunchStatus.FIXED] } }
    }),
    prisma.dailyLog.findFirst({
      where: { projectId: params.id },
      include: { author: { select: { name: true } } },
      orderBy: { date: "desc" }
    }),
    prisma.visit.findFirst({
      where: { projectId: params.id, date: { gte: new Date() } },
      include: { stage: { select: { name: true } } },
      orderBy: { date: "asc" }
    })
  ]);

  const estimateTotal = estimateItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const approvedChanges = changeOrders
    .filter((o) => o.status === ChangeOrderStatus.APPROVED)
    .reduce((sum, o) => sum + o.amount, 0);
  const doneStages = project.stages.filter((s) => s.status === "DONE").length;

  return NextResponse.json({
    project: { id: project.id, name: project.name, address: project.address, status: project.status },
    currency: project.currency,
    myRole: membership.role,
    progress: {
      done: doneStages,
      total: project.stages.length,
      percent: project.stages.length ? Math.round((doneStages / project.stages.length) * 100) : 0
    },
    stages: project.stages,
    photos,
    money: { estimateTotal, approvedChanges, grandTotal: estimateTotal + approvedChanges },
    changeOrders,
    pendingChangeOrders: changeOrders.filter((o) => o.status === ChangeOrderStatus.PENDING).length,
    openPunch,
    lastLog,
    nextVisit
  });
}
