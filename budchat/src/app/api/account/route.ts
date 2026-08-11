import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProjectRole } from "@prisma/client";

const profileSchema = z.object({
  name: z.string().min(2, "Введите имя").max(80, "Слишком длинное имя"),
  phone: z.string().max(32, "Слишком длинный номер").optional().nullable()
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const phone = parsed.data.phone?.trim();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name.trim(), phone: phone ? phone : null },
    select: { id: true, name: true, email: true, phone: true }
  });

  return NextResponse.json({ user: updated });
}

/**
 * Closing an account anonymises it instead of deleting the row.
 *
 * A hard delete would cascade through messages, photos and — worst of all —
 * approved change orders carrying the customer's signature. That signature is
 * the evidence this app exists to preserve, and it belongs to the project as
 * much as to the person who collected it. GDPR is satisfied by irreversibly
 * removing the personal data, which is what happens here: name, email, phone
 * and password are destroyed, access is revoked, and the work stays with the
 * projects under an anonymous author.
 */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Leaving a project with no administrator would lock everyone else out of
  // their own site, so the handover has to happen first.
  const adminMemberships = await prisma.projectMember.findMany({
    where: { userId: user.id, role: ProjectRole.ADMIN },
    select: { projectId: true, project: { select: { name: true } } }
  });

  const orphaned: string[] = [];
  for (const membership of adminMemberships) {
    const otherAdmins = await prisma.projectMember.count({
      where: {
        projectId: membership.projectId,
        role: ProjectRole.ADMIN,
        userId: { not: user.id }
      }
    });
    const otherMembers = await prisma.projectMember.count({
      where: { projectId: membership.projectId, userId: { not: user.id } }
    });
    if (otherAdmins === 0 && otherMembers > 0) orphaned.push(membership.project.name);
  }

  if (orphaned.length > 0) {
    return NextResponse.json(
      {
        error:
          `Вы единственный админ на объектах: ${orphaned.join(", ")}. ` +
          "Назначьте другого админа, иначе бригада потеряет доступ."
      },
      { status: 409 }
    );
  }

  const anonymousEmail = `deleted-${user.id}@budchat.invalid`;
  // A random hash nobody holds the password for — the account can never be
  // signed into again, and no code path has to special-case an empty hash.
  const deadHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  await prisma.$transaction([
    prisma.projectMember.deleteMany({ where: { userId: user.id } }),
    prisma.pushSubscription.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.userSettings.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Удалённый пользователь",
        email: anonymousEmail,
        phone: null,
        avatarUrl: null,
        passwordHash: deadHash
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
