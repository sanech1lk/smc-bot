import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requireProjectRole } from "@/lib/access";
import { InvitationStatus, ProjectRole } from "@prisma/client";
import { createToken, expiresInHours } from "@/lib/tokens";
import { appUrl } from "@/lib/mailer";
import { z } from "zod";

const schema = z.object({
  role: z.nativeEnum(ProjectRole).default(ProjectRole.WORKER)
});

/**
 * Issues a shareable join link (rendered as a QR code) so a foreman can add
 * crew members on site by letting them scan a phone screen, instead of
 * typing every email by hand.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError("unauthorized", 401);

  const access = await requireProjectRole(params.id, user.id, [ProjectRole.ADMIN]);
  if (!access.ok) return apiError(access.code, access.status);

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return apiError("validationFailed", 400);
  }

  // Replace any previous link for this role so an old QR photo stops working.
  await prisma.invitation.updateMany({
    where: {
      projectId: params.id,
      email: null,
      role: parsed.data.role,
      status: InvitationStatus.PENDING
    },
    data: { status: InvitationStatus.REVOKED }
  });

  const { token, tokenHash } = createToken();
  await prisma.invitation.create({
    data: {
      projectId: params.id,
      email: null,
      role: parsed.data.role,
      tokenHash,
      invitedById: user.id,
      expiresAt: expiresInHours(24 * 30)
    }
  });

  const url = appUrl(`/join/${token}`);
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: "#0f1115", light: "#ffffff" }
  });

  return NextResponse.json({ url, qrDataUrl, role: parsed.data.role }, { status: 201 });
}
