const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io"
  });

  // Every stage chat is its own room: "stage:<stageId>"
  io.on("connection", (socket) => {
    socket.on("stage:join", (stageId) => {
      if (typeof stageId === "string") {
        socket.join(`stage:${stageId}`);
      }
    });

    socket.on("stage:leave", (stageId) => {
      if (typeof stageId === "string") {
        socket.leave(`stage:${stageId}`);
      }
    });
  });

  // Expose the io instance to API route handlers running in this same process.
  globalThis.__budchatIO = io;

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> BudChat ready on http://${hostname}:${port}`);
    });
});
