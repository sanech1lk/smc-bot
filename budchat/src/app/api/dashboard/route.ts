import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { TaskStatus } from "@prisma/client";

/**
 * Cross-project overview for the foreman: what is on fire right now,
 * without opening every object one by one.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true }
  });
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    return NextResponse.json({
      stats: { projects: 0, activeStages: 0, problemStages: 0, overdueTasks: 0, myOpenTasks: 0 },
      problemStages: [],
      overdueTasks: [],
      myTasks: [],
      upcomingVisits: []
    });
  }

  const now = new Date();
  const openStatuses: TaskStatus[] = [TaskStatus.NEW, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];

  const [projectCount, activeStages, problemStages, overdueTasks, myTasks, upcomingVisits] =
    await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds } } }),
      prisma.stage.count({ where: { projectId: { in: projectIds }, status: "IN_PROGRESS" } }),
      prisma.stage.findMany({
        where: { projectId: { in: projectIds }, status: "PROBLEM" },
        select: {
          id: true,
          name: true,
          projectId: true,
          project: { select: { name: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 20
      }),
      prisma.task.findMany({
        where: {
          stage: { projectId: { in: projectIds } },
          status: { in: openStatuses },
          deadline: { lt: now }
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          status: true,
          assignee: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, projectId: true, project: { select: { name: true } } } }
        },
        orderBy: { deadline: "asc" },
        take: 20
      }),
      prisma.task.findMany({
        where: {
          stage: { projectId: { in: projectIds } },
          assigneeId: user.id,
          status: { in: openStatuses }
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          status: true,
          stage: { select: { id: true, name: true, projectId: true, project: { select: { name: true } } } }
        },
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        take: 20
      }),
      prisma.visit.findMany({
        where: { projectId: { in: projectIds }, date: { gte: now } },
        select: {
          id: true,
          date: true,
          crewName: true,
          note: true,
          projectId: true,
          project: { select: { name: true } },
          stage: { select: { id: true, name: true } }
        },
        orderBy: { date: "asc" },
        take: 10
      })
    ]);

  return NextResponse.json({
    stats: {
      projects: projectCount,
      activeStages,
      problemStages: problemStages.length,
      overdueTasks: overdueTasks.length,
      myOpenTasks: myTasks.length
    },
    problemStages,
    overdueTasks,
    myTasks,
    upcomingVisits
  });
}
