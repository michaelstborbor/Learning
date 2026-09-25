import { describe, it, expect } from "vitest";
import { generateToken, hashToken } from "./tokens";

describe("generateToken", () => {
  it("returns a raw token and a hash that don't match each other", () => {
    const { raw, hash } = generateToken();
    expect(raw).not.toBe(hash);
  });

  it("hashing the raw token reproduces the same hash (verifiability)", () => {
    const { raw, hash } = generateToken();
    expect(hashToken(raw)).toBe(hash);
  });

  it("generates a sufficiently long, high-entropy raw token", () => {
    const { raw } = generateToken();
    // 32 random bytes as hex = 64 characters. Long enough that guessing
    // is infeasible — this is the actual security property that matters
    // for a password-reset/verification/invite token.
    expect(raw).toHaveLength(64);
    expect(raw).toMatch(/^[0-9a-f]+$/);
  });

  it("produces different tokens on each call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it("hashToken is deterministic for the same input", () => {
    const raw = "some-fixed-value-for-testing";
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("hashToken produces different output for different input (no collisions in practice)", () => {
    expect(hashToken("value-a")).not.toBe(hashToken("value-b"));
  });
});
