// Next.js normally loads .env itself, but a custom server needs the values
// before `next()` boots — the startup guard below reads NEXTAUTH_SECRET, and
// Socket.io authentication needs it on the very first connection.
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const { assertEnv } = require("./env-guard");
assertEnv();

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// Created here and published on globalThis *before* Next boots, so the
// bundled `src/lib/prisma.ts` picks up this very instance instead of opening
// a second connection pool inside the same process.
const prisma = new PrismaClient({ log: dev ? ["error", "warn"] : ["error"] });
globalThis.prisma = prisma;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

/**
 * Socket.io hands us the raw Cookie header, while NextAuth's getToken only
 * reads a parsed `cookies` object — it never parses the header itself. The
 * session token is also split across `.0`, `.1`, … chunks when it grows past
 * the cookie size limit, so every cookie is parsed, not just the first match.
 */
function parseCookieHeader(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    if (!name) continue;

    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }

  return cookies;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io"
  });

  /**
   * The REST API checks the session and project membership on every route;
   * without this handshake check the socket would be a way around both, since
   * stage rooms broadcast messages, tasks, estimates and acceptance
   * signatures to whoever asked to join them.
   */
  io.use(async (socket, error) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const token = await getToken({
        req: { cookies, headers: socket.handshake.headers },
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token?.id) return error(new Error("unauthorized"));

      socket.data.userId = String(token.id);
      return error();
    } catch (cause) {
      console.error("[socket] Ошибка проверки сессии:", cause);
      return error(new Error("unauthorized"));
    }
  });

  // Every stage chat is its own room: "stage:<stageId>"
  io.on("connection", (socket) => {
    // A per-user room gives the app a way to reach every device of one person
    // — used to drop them out of stage rooms the moment access is revoked.
    socket.join(`user:${socket.data.userId}`);

    socket.on("stage:join", async (stageId) => {
      if (typeof stageId !== "string" || !stageId) return;

      try {
        const stage = await prisma.stage.findUnique({
          where: { id: stageId },
          select: { projectId: true }
        });
        if (!stage) return socket.emit("stage:denied", { stageId });

        // Knowing a stage id is not access: membership is re-checked here, so
        // removing someone from the project also closes their live feed.
        const membership = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId: stage.projectId, userId: socket.data.userId }
          },
          select: { id: true }
        });
        if (!membership) return socket.emit("stage:denied", { stageId });

        socket.join(`stage:${stageId}`);
      } catch (cause) {
        console.error("[socket] Ошибка проверки доступа к этапу:", cause);
        socket.emit("stage:denied", { stageId });
      }
    });

    socket.on("stage:leave", (stageId) => {
      if (typeof stageId === "string") {
        socket.leave(`stage:${stageId}`);
      }
    });
  });

  // Expose the io instance to API route handlers running in this same process.
  globalThis.__kelmaIO = io;

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Kelma ready on http://${hostname}:${port}`);
    });
});
