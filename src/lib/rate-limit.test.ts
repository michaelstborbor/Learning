import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { limit: 5, windowSeconds: 60 }).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowSeconds: 60 });
    }
    const result = checkRateLimit(key, { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count once the window has passed", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowSeconds: 60 });
    }
    expect(checkRateLimit(key, { limit: 5, windowSeconds: 60 }).allowed).toBe(false);

    // Move past the window.
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));

    expect(checkRateLimit(key, { limit: 5, windowSeconds: 60 }).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(keyA, { limit: 5, windowSeconds: 60 });
    }
    // keyA is now exhausted, but keyB should be unaffected.
    expect(checkRateLimit(keyA, { limit: 5, windowSeconds: 60 }).allowed).toBe(false);
    expect(checkRateLimit(keyB, { limit: 5, windowSeconds: 60 }).allowed).toBe(true);
  });
});
