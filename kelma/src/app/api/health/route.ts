import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Состояние проверяется на каждый запрос, кэшировать его нельзя.
export const dynamic = "force-dynamic";

/**
 * Проверка живости для Docker, прокси и внешнего мониторинга.
 *
 * Отвечает намеренно скупо: без версии, имени хоста и текста ошибки —
 * эндпоинт открыт без авторизации, и подсказывать посторонним, что именно
 * сломалось внутри, незачем. Подробности уходят в логи сервера.
 *
 * Запрос к базе здесь не формальность: контейнер, который поднялся, но
 * потерял базу, снаружи выглядит живым, а работать не может.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (cause) {
    console.error("[health] База недоступна:", cause);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
