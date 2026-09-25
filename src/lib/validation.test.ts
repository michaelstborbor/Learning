import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./validation";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(true);
  });

  it("lowercases and trims the email", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "  ADA@Example.COM  ",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("rejects a password under 8 characters", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "not-an-email",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a full name under 2 characters", () => {
    const result = registerSchema.safeParse({
      fullName: "A",
      email: "ada@example.com",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = registerSchema.safeParse({ email: "ada@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ email: "ada@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "ada@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("does not enforce a minimum length on login password (unlike registration)", () => {
    // Login should accept any non-empty password and let the server
    // decide if it's wrong — enforcing the 8-char registration rule here
    // would incorrectly reject legitimate old passwords if the minimum
    // length policy ever changed.
    const result = loginSchema.safeParse({ email: "ada@example.com", password: "short" });
    expect(result.success).toBe(true);
  });
});
