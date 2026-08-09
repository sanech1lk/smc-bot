import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";

const createSchema = z.object({
  signerName: z.string().min(2).max(100),
  imageData: z.string().refine((v) => v.startsWith("data:image/png;base64,"), {
    message: "Ожидается PNG data URL"
  })
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const signatures = await prisma.signature.findMany({
    where: { stageId: params.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ signatures });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return NextResponse.json({ error: "Этап не найден" }, { status: 404 });

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Roughly cap payload size (base64 PNG) so a stray full-res canvas can't blow up the DB row.
  if (parsed.data.imageData.length > 2_000_000) {
    return NextResponse.json({ error: "Подпись слишком большая" }, { status: 400 });
  }

  const signature = await prisma.signature.create({
    data: {
      stageId: params.id,
      signerId: user.id,
      signerName: parsed.data.signerName,
      imageData: parsed.data.imageData
    }
  });

  const stage = await prisma.stage.update({
    where: { id: params.id },
    data: { status: "DONE" }
  });

  emitToStage(params.id, "signature:new", signature);
  emitToStage(params.id, "stage:updated", stage);

  return NextResponse.json({ signature }, { status: 201 });
}
