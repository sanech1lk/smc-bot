import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
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
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const documents = await prisma.document.findMany({
    where: { projectId: params.id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ documents, myRole: membership.role });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const membership = await getMembership(params.id, user.id);
  if (!membership || membership.role === "CLIENT") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const file = formData.get("file");
  const categoryRaw = String(formData.get("category") ?? "OTHER");
  const nameRaw = formData.get("name");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Неподдерживаемый формат файла" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Файл слишком большой (максимум 25МБ)" }, { status: 400 });
  }
  if (!CATEGORIES.has(categoryRaw as DocumentCategory)) {
    return NextResponse.json({ error: "Некорректная категория" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "documents", params.id);
  await mkdir(uploadDir, { recursive: true });

  // Keep the extension from the original name, but never trust it as a path.
  const ext = (file.name.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const filename = `${crypto.randomUUID()}.${ext || "bin"}`;
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  const document = await prisma.document.create({
    data: {
      projectId: params.id,
      name: typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim() : file.name,
      url: `/uploads/documents/${params.id}/${filename}`,
      mimeType: file.type,
      sizeBytes: file.size,
      category: categoryRaw as DocumentCategory,
      uploadedById: user.id
    },
    include: { uploadedBy: { select: { id: true, name: true } } }
  });

  return NextResponse.json({ document }, { status: 201 });
}
