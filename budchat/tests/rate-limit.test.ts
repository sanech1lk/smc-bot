import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimits, clientIp, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    __resetRateLimits();
    vi.useRealTimers();
  });

  it("allows requests up to the limit and blocks the next one", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("key", 3, 60).ok).toBe(true);
    }
    const blocked = rateLimit("key", 3, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key independently", () => {
    expect(rateLimit("a", 1, 60).ok).toBe(true);
    expect(rateLimit("a", 1, 60).ok).toBe(false);
    expect(rateLimit("b", 1, 60).ok).toBe(true);
  });

  it("reports the remaining budget", () => {
    expect(rateLimit("k", 3, 60).remaining).toBe(2);
    expect(rateLimit("k", 3, 60).remaining).toBe(1);
    expect(rateLimit("k", 3, 60).remaining).toBe(0);
  });

  it("lets requests through again once the window elapses", () => {
    vi.useFakeTimers();
    expect(rateLimit("win", 1, 60).ok).toBe(true);
    expect(rateLimit("win", 1, 60).ok).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(rateLimit("win", 1, 60).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" }
    });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip and then to a placeholder", () => {
    const withReal = new Request("https://example.com", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientIp(withReal)).toBe("198.51.100.7");
    expect(clientIp(new Request("https://example.com"))).toBe("unknown");
  });
});
