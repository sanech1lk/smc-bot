import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, requireProjectRole } from "@/lib/access";
import { enforceRateLimit, UPLOAD_LIMIT } from "@/lib/rate-limit";
import { processPlan } from "@/lib/image";
import { ProjectRole } from "@prisma/client";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB — floor plans scanned at high res can be large

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const membership = await getMembership(params.id, user.id);
  if (!membership) return apiError("forbidden", 403);

  const plans = await prisma.plan.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { pins: true } } }
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN, ProjectRole.WORKER]);
  if (!access.ok) return apiError(access.code, access.status);

  const limited = enforceRateLimit("upload-plan", user.id, UPLOAD_LIMIT);
  if (limited) return limited;

  const formData = await req.formData().catch(() => null);
  if (!formData) return apiError("badRequest", 400);

  const file = formData.get("file");
  const nameRaw = formData.get("name");
  const name = typeof nameRaw === "string" && nameRaw.trim().length > 0 ? nameRaw.trim() : "План";

  if (!(file instanceof File)) {
    return apiError("fileMissing", 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return apiError("unsupportedFileType", 400);
  }
  if (file.size > MAX_SIZE) {
    return apiError("fileTooLarge", 400, { limit: 20 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "plans", params.id);
  await mkdir(uploadDir, { recursive: true });

  const original = Buffer.from(await file.arrayBuffer());
  const { buffer, ext } = await processPlan(original, file.type);
  const filename = `${crypto.randomUUID()}.${ext}`;
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
