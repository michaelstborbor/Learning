import { afterEach, describe, expect, it, vi } from "vitest";
import { appBaseUrl } from "./app-url";

afterEach(() => vi.unstubAllEnvs());

describe("appBaseUrl", () => {
  it("uses APP_BASE_URL when it is a valid URL", () => {
    vi.stubEnv("APP_BASE_URL", "https://learn.example.org/");
    expect(appBaseUrl()).toBe("https://learn.example.org");
  });

  it("falls back to the Vercel production URL when APP_BASE_URL is empty", () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "eliteskills.vercel.app");
    expect(appBaseUrl()).toBe("https://eliteskills.vercel.app");
  });

  it("skips a malformed APP_BASE_URL", () => {
    vi.stubEnv("APP_BASE_URL", "eliteskills.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "eliteskills-abc.vercel.app");
    expect(appBaseUrl()).toBe("https://eliteskills-abc.vercel.app");
  });

  it("defaults to localhost when nothing is set", () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(appBaseUrl()).toBe("http://localhost:3000");
  });
});
