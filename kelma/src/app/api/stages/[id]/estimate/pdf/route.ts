import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getMembership } from "@/lib/access";
import { PDF_FONT_BOLD, PDF_FONT_REGULAR } from "@/lib/pdf-fonts";
import { formatAmount, getCurrency } from "@/lib/currency";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const stage = await prisma.stage.findUnique({
    where: { id: params.id },
    include: { project: { select: { name: true, address: true, currency: true } } }
  });
  if (!stage) return apiError("stageNotFound", 404);

  const membership = await getMembership(stage.projectId, user.id);
  if (!membership) return apiError("forbidden", 403);

  const items = await prisma.estimate.findMany({
    where: { stageId: params.id },
    orderBy: { createdAt: "asc" }
  });
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const pdfBuffer = await renderEstimatePdf({
    projectName: stage.project.name,
    projectAddress: stage.project.address,
    stageName: stage.name,
    currency: stage.project.currency,
    items,
    total
  });

  const filename = `smeta-${transliterate(stage.name)}.pdf`;

  return new NextResponse(new Blob([new Uint8Array(pdfBuffer)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

interface EstimateRow {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

function renderEstimatePdf(args: {
  projectName: string;
  projectAddress: string;
  stageName: string;
  currency: string;
  items: EstimateRow[];
  total: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // pdfkit's built-in Standard 14 fonts (Helvetica etc.) are loaded from an
    // .afm file next to the module via a path that breaks once webpack
    // bundles this route, so we must hand it our own font up front instead
    // of letting it fall back to the default "Helvetica".
    const doc = new PDFDocument({ size: "A4", margin: 40, font: PDF_FONT_REGULAR });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("body", PDF_FONT_REGULAR);
    doc.registerFont("bold", PDF_FONT_BOLD);

    doc.font("bold").fontSize(18).text("Kelma — смета", { align: "left" });
    doc.moveDown(0.3);
    doc.font("bold").fontSize(13).text(args.projectName);
    doc.font("body").fontSize(10).fillColor("#555").text(args.projectAddress);
    doc.moveDown(0.3);
    doc.font("bold").fontSize(12).fillColor("#000").text(`Этап: ${args.stageName}`);
    doc
      .font("body")
      .fontSize(9)
      .fillColor("#777")
      .text(`Сформировано: ${new Date().toLocaleString("ru-RU")}`);
    doc.moveDown(1);

    const colX = { name: 40, unit: 300, qty: 350, price: 410, total: 480 };
    const rowTop = doc.y;
    doc.font("bold").fontSize(10).fillColor("#000");
    doc.text("Наименование", colX.name, rowTop, { width: 250 });
    doc.text("Ед.", colX.unit, rowTop, { width: 40 });
    doc.text("Кол-во", colX.qty, rowTop, { width: 50, align: "right" });
    doc.text("Цена", colX.price, rowTop, { width: 60, align: "right" });
    doc.text("Сумма", colX.total, rowTop, { width: 75, align: "right" });
    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor("#ccc")
      .stroke();
    doc.moveDown(0.3);

    doc.font("body").fontSize(10).fillColor("#000");
    if (args.items.length === 0) {
      doc.fillColor("#777").text("Смета пуста", 40, doc.y);
      doc.moveDown(1);
    }
    for (const item of args.items) {
      const y = doc.y;
      doc.fillColor("#000");
      doc.text(item.itemName, colX.name, y, { width: 250 });
      doc.text(item.unit, colX.unit, y, { width: 40 });
      doc.text(formatAmount(item.quantity, args.currency), colX.qty, y, { width: 50, align: "right" });
      doc.text(formatAmount(item.unitPrice, args.currency), colX.price, y, { width: 60, align: "right" });
      doc.text(formatAmount(item.totalPrice, args.currency), colX.total, y, { width: 75, align: "right" });
      doc.moveDown(0.6);

      if (doc.y > 760) {
        doc.addPage();
      }
    }

    doc.moveDown(0.3);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor("#000")
      .stroke();
    doc.moveDown(0.4);

    doc.font("bold").fontSize(13);
    doc.text(
      `Итого: ${formatAmount(args.total, args.currency)} ${getCurrency(args.currency).symbol}`,
      40,
      doc.y,
      { width: 515, align: "right" }
    );

    doc.end();
  });
}

function transliterate(input: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", " ": "-"
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? (/[a-z0-9-]/.test(ch) ? ch : ""))
    .join("")
    .replace(/-+/g, "-")
    .slice(0, 50) || "estimate";
}
