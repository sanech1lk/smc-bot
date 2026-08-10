import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";

const createSchema = z.object({
  title: z.string().min(2, "Опишите дефект").max(200),
  description: z.string().max(2000).optional(),
  stageId: z.string().optional(),
  assigneeId: z.string().optional(),
  photoId: z.string().optional(),
  dueDate: z.string().optional()
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const items = await prisma.punchItem.findMany({
    where: { projectId: params.id },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return NextResponse.json({ items, myRole: membership.role });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.assigneeId) {
    const assignee = await getMembership(params.id, parsed.data.assigneeId);
    if (!assignee) {
      return NextResponse.json({ error: "Исполнитель не состоит в объекте" }, { status: 400 });
    }
  }

  const item = await prisma.punchItem.create({
    data: {
      projectId: params.id,
      stageId: parsed.data.stageId || null,
      title: parsed.data.title,
      description: parsed.data.description,
      assigneeId: parsed.data.assigneeId || null,
      photoId: parsed.data.photoId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      createdById: user.id
    },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      photo: { select: { id: true, url: true } }
    }
  });

  return NextResponse.json({ item }, { status: 201 });
}
