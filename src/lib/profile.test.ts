import { describe, expect, it } from "vitest";
import { avatarUrl, fullNameSchema, initials, profileSchema, usernameSchema } from "./profile";

describe("fullNameSchema", () => {
  it("keeps the name exactly as typed, apart from trimming the ends", () => {
    expect(fullNameSchema.parse("  Foday Mansaray ")).toBe("Foday Mansaray");
    expect(fullNameSchema.parse("mariama o'Neil-jALLOH")).toBe("mariama o'Neil-jALLOH");
    expect(fullNameSchema.parse("Ɛsther Kɔroma Ŋaujah")).toBe("Ɛsther Kɔroma Ŋaujah");
    expect(fullNameSchema.parse("Dr. Aminata Sesay")).toBe("Dr. Aminata Sesay");
  });

  it("refuses names a certificate shouldn't carry", () => {
    expect(fullNameSchema.safeParse("A").success).toBe(false);
    expect(fullNameSchema.safeParse("Foday  Mansaray").success).toBe(false);
    expect(fullNameSchema.safeParse("Foday <b>Mansaray</b>").success).toBe(false);
    expect(fullNameSchema.safeParse("Foday 123").success).toBe(false);
    expect(fullNameSchema.safeParse("--").success).toBe(false);
    expect(fullNameSchema.safeParse("x".repeat(121)).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("stores usernames in lower case", () => {
    expect(usernameSchema.parse("Foday_M")).toBe("foday_m");
    expect(usernameSchema.parse("a.b2")).toBe("a.b2");
  });

  it("refuses bad or reserved usernames", () => {
    for (const bad of ["ab", "_foday", "foday.", "fo..day", "fo day", "admin", "x".repeat(31)]) {
      expect(usernameSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("profileSchema", () => {
  it("turns empty optional fields into null", () => {
    expect(profileSchema.parse({ fullName: "Foday Mansaray", username: "", phone: "", location: " ", bio: "" })).toEqual({
      fullName: "Foday Mansaray",
      username: null,
      phone: null,
      location: null,
      bio: null,
    });
  });

  it("checks phone numbers loosely", () => {
    expect(profileSchema.safeParse({ fullName: "Foday", phone: "+232 76 123 456" }).success).toBe(true);
    expect(profileSchema.safeParse({ fullName: "Foday", phone: "call me" }).success).toBe(false);
  });
});

describe("initials and avatarUrl", () => {
  it("uses the first and last names", () => {
    expect(initials("Foday Sorie Mansaray")).toBe("FM");
    expect(initials("aminata")).toBe("A");
  });

  it("only gives a URL when there is a photo", () => {
    expect(avatarUrl("u1", null)).toBeNull();
    expect(avatarUrl("u1", new Date(5))).toBe("/api/users/u1/avatar?v=5");
  });
});
