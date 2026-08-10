import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { InvitationStatus } from "@prisma/client";

export type AcceptResult =
  | { ok: true; projectId: string; alreadyMember: boolean }
  | { ok: false; status: number; error: string };

/**
 * Redeems an invitation token for a user. Handles both email invitations
 * and shareable link/QR invitations; link invitations stay usable by other
 * people, email invitations are marked accepted once used.
 */
export async function acceptInvitation(token: string, userId: string): Promise<AcceptResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) }
  });

  if (!invitation || invitation.status === InvitationStatus.REVOKED) {
    return { ok: false, status: 404, error: "Приглашение недействительно" };
  }
  if (invitation.expiresAt < new Date()) {
    return { ok: false, status: 400, error: "Срок приглашения истёк" };
  }
  // An email invitation is single-use; a link invitation stays open.
  if (invitation.email && invitation.status === InvitationStatus.ACCEPTED) {
    return { ok: false, status: 400, error: "Приглашение уже использовано" };
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: invitation.projectId, userId } }
  });

  if (existing) {
    return { ok: true, projectId: invitation.projectId, alreadyMember: true };
  }

  await prisma.projectMember.create({
    data: { projectId: invitation.projectId, userId, role: invitation.role }
  });

  if (invitation.email) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() }
    });
  }

  return { ok: true, projectId: invitation.projectId, alreadyMember: false };
}
