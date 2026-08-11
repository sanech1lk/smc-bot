import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { enforceRateLimit, UPLOAD_LIMIT } from "@/lib/rate-limit";
import { isProcessableImage, processPhoto } from "@/lib/image";
import { DocumentCategory } from "@prisma/client";

// Contracts and drawings are usually PDFs; office formats and images are
// allowed too so a certificate photo or an XLSX estimate can live here.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
const MAX_SIZE = 25 * 1024 * 1024;
const CATEGORIES = new Set(Object.values(DocumentCategory));

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const membership = await getMembership(params.id, user.id);
  if (!membership) return apiError("forbidden", 403);

  const documents = await prisma.document.findMany({
    where: { projectId: params.id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ documents, myRole: membership.role });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const membership = await getMembership(params.id, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  const limited = enforceRateLimit("upload-document", user.id, UPLOAD_LIMIT);
  if (limited) return limited;

  const formData = await req.formData().catch(() => null);
  if (!formData) return apiError("badRequest", 400);

  const file = formData.get("file");
  const categoryRaw = String(formData.get("category") ?? "OTHER");
  const nameRaw = formData.get("name");

  if (!(file instanceof File)) {
    return apiError("fileMissing", 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return apiError("unsupportedFileType", 400);
  }
  if (file.size > MAX_SIZE) {
    return apiError("fileTooLarge", 400, { limit: 25 });
  }
  if (!CATEGORIES.has(categoryRaw as DocumentCategory)) {
    return apiError("invalidCategory", 400);
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", params.id);
  await mkdir(uploadDir, { recursive: true });

  // Photographed certificates get the same shrinking as site photos, while
  // contracts and drawings must survive byte-for-byte — a re-encoded PDF is
  // not the document that was signed.
  const original = Buffer.from(await file.arrayBuffer());
  const processable = isProcessableImage(file.type);
  const stored = processable
    ? await processPhoto(original, file.type)
    : { buffer: original, ext: "", processed: false };

  // Keep the extension from the original name, but never trust it as a path.
  const originalExt = (file.name.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const ext = stored.processed ? stored.ext : originalExt || "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), stored.buffer);

  const document = await prisma.document.create({
    data: {
      projectId: params.id,
      name: typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : file.name,
      url: `/uploads/documents/${params.id}/${filename}`,
      mimeType: stored.processed ? "image/jpeg" : file.type,
      sizeBytes: stored.buffer.byteLength,
      category: categoryRaw as DocumentCategory,
      uploadedById: user.id
    },
    include: { uploadedBy: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ document }, { status: 201 });
}
