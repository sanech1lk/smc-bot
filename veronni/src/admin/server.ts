import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Bot } from "grammy";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { changeOrderStatus } from "../status.js";
import { loginPage, ordersPage } from "./page.js";

const COOKIE = "veronni_admin";

// Сессии живут в памяти: перезапуск процесса разлогинивает, и это правильнее,
// чем хранить долгоживущий токен в файле на демо-сервере.
const sessions = new Set<string>();

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isAuthorized(req: IncomingMessage): boolean {
  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE && sessions.has(rest.join("="))) return true;
  }
  return false;
}

async function readBody(req: IncomingMessage, limit = 8 * 1024): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new Error("Тело запроса слишком большое");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function html(res: ServerResponse, body: string, status = 200): void {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

function json(res: ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

export function createAdminServer(bot: Bot | null) {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;

    try {
      if (req.method === "POST" && path === "/login") {
        const body = await readBody(req);
        const password = new URLSearchParams(body).get("password") ?? "";
        if (!config.adminPassword || !constantTimeEquals(password, config.adminPassword)) {
          html(res, loginPage("Неверный пароль"), 401);
          return;
        }
        const token = randomBytes(24).toString("hex");
        sessions.add(token);
        res.writeHead(302, {
          location: "/",
          "set-cookie": `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`,
        });
        res.end();
        return;
      }

      if (path === "/") {
        html(res, isAuthorized(req) ? ordersPage() : loginPage());
        return;
      }

      // Браузер просит favicon сам; без этой ветки он получал бы 401 и сорил
      // в консоли на странице входа.
      if (path === "/favicon.ico") {
        res.writeHead(204).end();
        return;
      }

      if (!isAuthorized(req)) {
        json(res, { error: "unauthorized" }, 401);
        return;
      }

      if (req.method === "GET" && path === "/api/orders") {
        const orders = await prisma.order.findMany({
          orderBy: { number: "desc" },
          take: 60,
          include: { items: true },
        });
        json(res, orders);
        return;
      }

      const statusMatch = /^\/api\/orders\/(\d+)\/status$/.exec(path);
      if (req.method === "POST" && statusMatch) {
        const body = await readBody(req);
        let status = "";
        try {
          status = String((JSON.parse(body) as { status?: unknown }).status ?? "");
        } catch {
          json(res, { error: "bad_json" }, 400);
          return;
        }
        const updated = await changeOrderStatus(bot, Number(statusMatch[1]), status);
        if (!updated) {
          json(res, { error: "not_found_or_bad_status" }, 400);
          return;
        }
        json(res, updated);
        return;
      }

      json(res, { error: "not_found" }, 404);
    } catch (error) {
      console.error("Ошибка админки:", error);
      json(res, { error: "internal" }, 500);
    }
  });
}
