import { prisma } from "@/lib/prisma";
import { createToken, expiresInHours, hashToken } from "@/lib/tokens";
import { appUrl, sendMail } from "@/lib/mailer";
import { InvitationStatus } from "@prisma/client";

/**
 * Proving control of an email address matters here for one concrete reason:
 * project invitations are addressed by email, and are turned into real
 * memberships by matching that address. Without proof, registering as
 * `foreman@firm.com` right after they were invited would hand the attacker
 * their place on the project.
 *
 * So the rule is narrow rather than blanket: signing up and using the app
 * works straight away, but invitations addressed to an email wait until that
 * email is confirmed. QR and link invitations are unaffected — holding the
 * link is itself the proof, and that flow has to keep working for a worker
 * standing on site with the foreman.
 */

const TOKEN_TTL_HOURS = 24;

export async function issueEmailVerification(userId: string, email: string, name: string) {
  // Only the newest link should work, same as password reset.
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() }
  });

  const { token, tokenHash } = createToken();
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt: expiresInHours(TOKEN_TTL_HOURS) }
  });

  const link = appUrl(`/verify-email?token=${token}`);
  await sendMail({
    to: email,
    subject: "Kelma — подтверждение адреса",
    text: [
      `Здравствуйте, ${name}!`,
      "",
      "Подтвердите адрес почты, чтобы получить приглашения на объекты,",
      `отправленные на ${email}. Ссылка действует ${TOKEN_TTL_HOURS} часа:`,
      "",
      link,
      "",
      "Если вы не регистрировались в Kelma — просто проигнорируйте это письмо."
    ].join("\n")
  });
}

export type VerifyResult =
  | { ok: true; joinedProjects: number }
  | { ok: false; reason: "invalid" };

/**
 * Marks the address confirmed and redeems everything that was waiting on it.
 */
export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, reason: "invalid" };
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() }
    })
  ]);

  const joinedProjects = await acceptPendingEmailInvitations(record.user.id, record.user.email);
  return { ok: true, joinedProjects };
}

/**
 * Turns invitations addressed to a now-confirmed email into memberships.
 * Safe to call more than once — `skipDuplicates` covers the case where the
 * person was already added to the project by hand in the meantime.
 */
export async function acceptPendingEmailInvitations(
  userId: string,
  email: string
): Promise<number> {
  const invitations = await prisma.invitation.findMany({
    where: {
      email,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: new Date() }
    }
  });

  if (invitations.length === 0) return 0;

  await prisma.$transaction([
    prisma.projectMember.createMany({
      data: invitations.map((invitation) => ({
        projectId: invitation.projectId,
        userId,
        role: invitation.role
      })),
      skipDuplicates: true
    }),
    prisma.invitation.updateMany({
      where: { id: { in: invitations.map((invitation) => invitation.id) } },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() }
    })
  ]);

  return invitations.length;
}
