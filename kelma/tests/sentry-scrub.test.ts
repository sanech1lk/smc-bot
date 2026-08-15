import { describe, expect, it } from "vitest";
import {
  REDACTED,
  isSensitiveKey,
  redactDeep,
  scrubEvent,
  stripQuery
} from "@/lib/sentry-scrub";

describe("stripQuery", () => {
  it("drops a password reset token from the URL", () => {
    expect(stripQuery("https://kelma.dev/reset-password?token=abc123")).toBe(
      "https://kelma.dev/reset-password"
    );
  });

  it("drops a fragment as well", () => {
    expect(stripQuery("https://kelma.dev/projects#secret")).toBe("https://kelma.dev/projects");
  });

  it("keeps the path, which is what makes an error locatable", () => {
    expect(stripQuery("https://kelma.dev/projects/abc/stages/def")).toBe(
      "https://kelma.dev/projects/abc/stages/def"
    );
  });

  it("leaves a URL without a query untouched", () => {
    expect(stripQuery("/api/projects")).toBe("/api/projects");
  });

  it("does not throw on a malformed URL", () => {
    expect(stripQuery("not a url at all ?x=1")).toBe("not a url at all ");
  });
});

describe("isSensitiveKey", () => {
  it("catches secrets by substring, case-insensitively", () => {
    for (const key of ["token", "resetToken", "PASSWORD", "Authorization", "signatureData"]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it("catches personal fields by exact name", () => {
    for (const key of ["email", "phone", "lat", "lng", "address", "startLat"]) {
      expect(isSensitiveKey(key), key).toBe(true);
    }
  });

  it("does not over-match ordinary field names", () => {
    for (const key of ["latest", "relation", "template", "quantityPlanned", "status", "id"]) {
      expect(isSensitiveKey(key), key).toBe(false);
    }
  });
});

describe("redactDeep", () => {
  it("redacts nested values without touching the original object", () => {
    const input = { user: { id: "u1", email: "a@b.c" }, items: [{ token: "t" }] };
    const out = redactDeep(input) as typeof input;

    expect(out.user.email).toBe(REDACTED);
    expect(out.user.id).toBe("u1");
    expect(out.items[0].token).toBe(REDACTED);
    expect(input.user.email).toBe("a@b.c");
  });

  it("survives deeply nested structures instead of recursing forever", () => {
    let deep: Record<string, unknown> = { value: 1 };
    for (let i = 0; i < 20; i += 1) deep = { nested: deep };
    expect(() => redactDeep(deep)).not.toThrow();
  });

  it("passes primitives and null through", () => {
    expect(redactDeep(null)).toBe(null);
    expect(redactDeep(42)).toBe(42);
    expect(redactDeep("text")).toBe("text");
  });
});

describe("scrubEvent", () => {
  it("removes the request body, cookies and query string", () => {
    const event = scrubEvent({
      request: {
        url: "https://kelma.dev/reset-password?token=abc",
        cookies: { "next-auth.session-token": "jwt" },
        data: { password: "hunter2" },
        query_string: "token=abc"
      }
    });

    expect(event.request?.url).toBe("https://kelma.dev/reset-password");
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
  });

  it("keeps only the user agent out of the headers", () => {
    const event = scrubEvent({
      request: {
        headers: {
          "user-agent": "Mozilla/5.0",
          Authorization: "Bearer secret",
          cookie: "session=1",
          "x-forwarded-for": "1.2.3.4"
        }
      }
    });

    expect(event.request?.headers).toEqual({ "user-agent": "Mozilla/5.0" });
  });

  it("reduces the user to an id and a role", () => {
    const event = scrubEvent({
      user: {
        id: "u1",
        role: "ADMIN",
        email: "prorab@kelma.dev",
        username: "Игорь",
        ip_address: "1.2.3.4"
      }
    });

    expect(event.user).toEqual({ id: "u1", role: "ADMIN" });
  });

  it("leaves no user object when there is nothing safe to keep", () => {
    const event = scrubEvent({ user: { email: "a@b.c", ip_address: "1.2.3.4" } });
    expect(event.user).toEqual({});
  });

  it("redacts GPS coordinates carried in extra data", () => {
    const event = scrubEvent({
      extra: { photo: { id: "p1", lat: 55.75, lng: 37.61, tag: "problem" } }
    });

    const photo = (event.extra as { photo: Record<string, unknown> }).photo;
    expect(photo.lat).toBe(REDACTED);
    expect(photo.lng).toBe(REDACTED);
    expect(photo.tag).toBe("problem");
    expect(photo.id).toBe("p1");
  });

  it("drops the server hostname", () => {
    const event = scrubEvent({ server_name: "kelma-prod-7f9c" });
    expect(event.server_name).toBeUndefined();
  });

  it("handles an event with nothing to scrub", () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});
