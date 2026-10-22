import { z } from "zod";

// Upper bounds on every field keep a single request from storing (or
// hashing) megabytes of text.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "That name is too long."),
  email: z.string().trim().toLowerCase().max(254, "That email is too long.").email("Enter a valid email address."),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254, "That email is too long.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128, "Incorrect email or password."),
});

/** A web link that is safe to show as a clickable link: only http(s), so a
 * stored "javascript:" or "data:" URL can never run in someone's browser. */
export const webUrlSchema = z
  .string()
  .trim()
  .max(2000, "That link is too long.")
  .url("Enter a full link, starting with https://")
  .refine((value) => /^https?:\/\//i.test(value), "Links must start with http:// or https://");

/** For rendering stored links: returns the URL only when it is http(s). */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined;
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
