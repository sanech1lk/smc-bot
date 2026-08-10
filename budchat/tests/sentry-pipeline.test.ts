import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

/**
 * End-to-end guard on the privacy contract: the real SDK is pointed at a local
 * collector and we assert on the bytes that actually leave the process.
 *
 * Unit-testing the scrubber is not enough — Sentry adds its own data after
 * `beforeSend` is written (IP addresses, source context, integrations), so the
 * only trustworthy check is reading the finished envelope.
 */

let server: Server;
let received: string[] = [];
let port = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("live Sentry pipeline", () => {
  it("sends the event but strips every piece of personal data", async () => {
    process.env.SENTRY_DSN = `http://abc123@127.0.0.1:${port}/1`;

    const Sentry = await import("@sentry/nextjs");
    const { baseOptions } = await import("@/lib/sentry-options");

    Sentry.init({ ...baseOptions(), transportOptions: {} } as never);

    // Built at runtime so these literals never appear in this file's source —
    // otherwise Sentry's source-context lines would echo them back and the
    // assertions below would fail for the wrong reason.
    const secrets = {
      email: ["prorab", "budchat.dev"].join("@"),
      token: ["super", "secret", "token"].join("-"),
      lat: Number("55.7512" + "44"),
      ip: ["1", "2", "3", "4"].join(".")
    };

    Sentry.setUser({ id: "user-1", email: secrets.email, ip_address: secrets.ip });
    Sentry.captureException(new Error("Boom on the site"), {
      extra: {
        photo: { id: "p1", lat: secrets.lat, lng: 37.618423 },
        resetToken: secrets.token
      }
    });

    await Sentry.flush(4000);

    const payload = received.join("\n");
    expect(payload).toContain("Boom on the site");
    expect(payload).toContain("user-1");

    // The whole point of the scrubber.
    expect(payload).not.toContain(secrets.email);
    expect(payload).not.toContain(secrets.token);
    expect(payload).not.toContain(String(secrets.lat));
    expect(payload).not.toContain(secrets.ip);
  }, 20000);
});
