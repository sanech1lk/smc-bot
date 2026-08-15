import { describe, expect, it } from "vitest";
import { createToken, expiresInHours, hashToken } from "@/lib/tokens";

describe("tokens", () => {
  it("never returns the same token twice", () => {
    const seen = new Set(Array.from({ length: 50 }, () => createToken().token));
    expect(seen.size).toBe(50);
  });

  it("stores a hash that differs from the plain token", () => {
    const { token, tokenHash } = createToken();
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toHaveLength(64);
  });

  it("hashes deterministically so lookups by hash work", () => {
    const { token, tokenHash } = createToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("produces URL-safe tokens", () => {
    for (let i = 0; i < 20; i++) {
      expect(createToken().token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("computes a future expiry", () => {
    const inTwoHours = expiresInHours(2).getTime() - Date.now();
    expect(inTwoHours).toBeGreaterThan(1.9 * 60 * 60 * 1000);
    expect(inTwoHours).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });
});
