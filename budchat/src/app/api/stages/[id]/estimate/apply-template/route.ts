import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership, getStageWithProjectId } from "@/lib/access";
import { emitToStage } from "@/lib/socket-server";
import { ESTIMATE_TEMPLATES, getTemplate, templatesForStage } from "@/lib/estimate-templates";

const schema = z.object({ templateId: z.string().min(1) });

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Lists available templates, most relevant to this stage first. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const templates = stageRef.name ? templatesForStage(stageRef.name) : ESTIMATE_TEMPLATES;

  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      itemCount: t.items.length,
      suggested: t.stages.includes(stageRef.name),
      total: round2(t.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0))
    }))
  });
}

/** Appends every line of a template to the stage's estimate, with history. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stageRef = await getStageWithProjectId(params.id);
  if (!stageRef) return apiError("stageNotFound", 404);

  const membership = await getMembership(stageRef.projectId, user.id);
  if (!membership || membership.role === "CLIENT") {
    return apiError("insufficientRights", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalidTemplate", 400);
  }

  const template = getTemplate(parsed.data.templateId);
  if (!template) return apiError("templateNotFound", 404);

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const item of template.items) {
      const totalPrice = round2(item.quantity * item.unitPrice);
      const row = await tx.estimate.create({
        data: {
          stageId: params.id,
          itemName: item.itemName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice
        }
      });
      await tx.estimateHistory.create({
        data: {
          estimateId: row.id,
          stageId: params.id,
          changedById: user.id,
          itemName: row.itemName,
          unit: row.unit,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
          action: "created"
        }
      });
      rows.push(row);
    }
    return rows;
  });

  for (const row of created) {
    emitToStage(params.id, "estimate:new", row);
  }

  return NextResponse.json({ items: created, added: created.length }, { status: 201 });
}
