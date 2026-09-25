import "server-only";
import { randomBytes, createHash } from "node:crypto";

/** Generates a raw token (goes in the email link) and its hash (goes in
 * the database). The raw value is never stored — only ever exists in the
 * link and in memory for the current request. Same discipline as a
 * password: a database read alone can never produce something usable. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
