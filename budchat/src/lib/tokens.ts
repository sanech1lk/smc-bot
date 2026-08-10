import crypto from "crypto";

/**
 * Generates a URL-safe secret plus its SHA-256 hash. Only the hash is ever
 * persisted, so a database leak cannot be replayed to reset a password or
 * accept an invitation.
 */
export function createToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function expiresInHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
