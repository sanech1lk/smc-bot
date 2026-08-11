import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { PhotoTag } from "@prisma/client";
import { emitToStage } from "@/lib/socket-server";
import { sendPushToProjectMembers } from "@/lib/push-server";
import { enforceRateLimit, UPLOAD_LIMIT } from "@/lib/rate-limit";
import { processPhoto } from "@/lib/image";

const ALLOWED_TAGS = new Set(Object.values(PhotoTag));
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

function parseFiniteCoordinate(value: FormDataEntryValue | null, min: number, max: number): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");

  const photos = await prisma.photo.findMany({
    where: {
      stageId: params.id,
      ...(tag && ALLOWED_TAGS.has(tag as PhotoTag) ? { tag: tag as PhotoTag } : {})
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ photos });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const limited = enforceRateLimit("upload-photo", user.id, UPLOAD_LIMIT);
  if (limited) return limited;

  const formData = await req.formData().catch(() => null);
  if (!formData) return apiError("badRequest", 400);

  const file = formData.get("file");
  const tagRaw = String(formData.get("tag") ?? "BEFORE");
  const description = formData.get("description");
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const accuracyRaw = formData.get("accuracy");

  if (!(file instanceof File)) {
    return apiError("fileMissing", 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return apiError("unsupportedFileType", 400);
  }
  if (file.size > MAX_SIZE) {
    return apiError("fileTooLarge", 400, { limit: 15 });
  }
  if (!ALLOWED_TAGS.has(tagRaw as PhotoTag)) {
    return apiError("invalidPhotoTag", 400);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", params.id);
  await mkdir(uploadDir, { recursive: true });

  // Resized and stripped of metadata before it touches the disk — see
  // lib/image.ts for why the GPS tags are dropped here specifically.
  const original = Buffer.from(await file.arrayBuffer());
  const { buffer, ext } = await processPhoto(original, file.type);
  const filename = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/${params.id}/${filename}`;

  const lat = parseFiniteCoordinate(latRaw, -90, 90);
  const lng = parseFiniteCoordinate(lngRaw, -180, 180);
  const accuracy = parseFiniteCoordinate(accuracyRaw, 0, 1_000_000);

  const photo = await prisma.photo.create({
    data: {
      stageId: params.id,
      uploadedById: user.id,
      url,
      tag: tagRaw as PhotoTag,
      description: typeof description === "string" && description.length > 0 ? description : null,
      lat,
      lng,
      accuracy
    },
    include: { uploadedBy: { select: { id: true, name: true } } }
  });

  emitToStage(params.id, "photo:new", photo);

  // Off by default (see UserSettings.notifyPhotos) — a photo lands on the
  // stage feed constantly during a normal workday, and pushing every one of
  // them to the whole team by default would train people to ignore BudChat
  // notifications entirely.
  sendPushToProjectMembers(
    stageRef.projectId,
    {
      title: `Новое фото · ${stageRef.name}`,
      body: photo.uploadedBy.name,
      url: `/projects/${stageRef.projectId}/stages/${params.id}`,
      tag: `photo-${photo.id}`
    },
    user.id,
    "photos"
  ).catch((err) => console.error("Push notify failed", err));

  return NextResponse.json({ photo }, { status: 201 });
}
