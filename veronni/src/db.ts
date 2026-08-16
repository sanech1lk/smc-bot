import { PrismaClient } from "@prisma/client";

// tsx watch перезапускает модуль на каждое изменение; без globalThis SQLite
// быстро упирается в десяток открытых соединений.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
globalForPrisma.prisma = prisma;
