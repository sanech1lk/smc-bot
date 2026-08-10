import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { acceptInvitation } from "@/lib/invitations";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректная ссылка" }, { status: 400 });
  }

  const result = await acceptInvitation(parsed.data.token, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    alreadyMember: result.alreadyMember
  });
}
