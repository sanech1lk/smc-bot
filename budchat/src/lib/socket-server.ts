import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __budchatIO: Server | undefined;
}

/**
 * The Socket.io server instance is created once in server.js (the custom
 * Node server that wraps Next.js) and stashed on globalThis so API route
 * handlers running in the same process can broadcast events to it.
 */
export function getIO(): Server | undefined {
  return globalThis.__budchatIO;
}

export function emitToStage(stageId: string, event: string, payload: unknown) {
  const io = getIO();
  if (!io) return;
  io.to(`stage:${stageId}`).emit(event, payload);
}
