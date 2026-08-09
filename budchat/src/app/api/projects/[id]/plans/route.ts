import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, requireProjectRole } from "@/lib/access";
import { ProjectRole } from "@prisma/client";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB — floor plans scanned at high res can be large

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const plans = await prisma.plan.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { pins: true } } }
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN, ProjectRole.WORKER]);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const file = formData.get("file");
  const nameRaw = formData.get("name");
  const name = typeof nameRaw === "string" && nameRaw.trim().length > 0 ? nameRaw.trim() : "План";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Неподдерживаемый формат файла" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой (максимум 20МБ)" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "plans", params.id);
  await mkdir(uploadDir, { recursive: true });

  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const plan = await prisma.plan.create({
    data: {
      projectId: params.id,
      name,
      url: `/uploads/plans/${params.id}/${filename}`
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
