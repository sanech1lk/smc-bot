import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __kelmaIO: Server | undefined;
}

/**
 * The Socket.io server instance is created once in server.js (the custom
 * Node server that wraps Next.js) and stashed on globalThis so API route
 * handlers running in the same process can broadcast events to it.
 */
export function getIO(): Server | undefined {
  return globalThis.__kelmaIO;
}

export function emitToStage(stageId: string, event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;
  io.to(`stage:${stageId}`).emit(event, payload);
}

/**
 * Membership is checked when a socket joins a stage room, but an already-open
 * socket would keep receiving events after the person is removed from the
 * project. Removing a member therefore has to evict their live connections
 * too — otherwise a dismissed subcontractor keeps reading the crew's chat
 * until they happen to close the tab.
 */
export function revokeStageAccess(userId: string, stageIds: string[]) {
  const io = getIO();
  if (!io || stageIds.length === 0) return;

  for (const stageId of stageIds) {
    io.in(`user:${userId}`).socketsLeave(`stage:${stageId}`);
  }

  io.to(`user:${userId}`).emit("access:revoked", { stageIds });
}
