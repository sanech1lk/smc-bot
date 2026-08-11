import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_SETTINGS, sanitizeSettingsPatch, type UserSettingsShape } from "@/lib/settings";

/** Only the preference fields travel to the client — no row ids or timestamps. */
function toShape(row: Record<string, unknown>): UserSettingsShape {
  const out = {} as UserSettingsShape;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof UserSettingsShape)[]) {
    (out[key] as unknown) = row[key] ?? DEFAULT_SETTINGS[key];
  }
  return out;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Created on first read rather than at registration, so accounts that never
  // touch the settings screen cost nothing.
  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id }
  });

  return NextResponse.json({ settings: toShape(settings) });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const patch = sanitizeSettingsPatch(body);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Нечего сохранять" }, { status: 400 });
  }

  // Consent has to be provable, so the moment it was given is recorded and
  // cleared again on withdrawal.
  const data: Record<string, unknown> = { ...patch };
  if (typeof patch.adsPersonalized === "boolean") {
    data.adsConsentAt = patch.adsPersonalized ? new Date() : null;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data }
  });

  return NextResponse.json({ settings: toShape(settings) });
}
