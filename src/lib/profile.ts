import { z } from "zod";

// Rules for the profile page (/account/profile), shared by the form and the
// API so both say the same thing.

// The full name is printed on certificates word for word, so it is only
// trimmed at the ends: never re-cased, re-spaced or otherwise "tidied".
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Keep your full name under 120 characters.")
  .refine((value) => /\p{L}/u.test(value), "Your full name needs at least one letter.")
  .refine(
    (value) => /^[\p{L}\p{M}' .\-’]+$/u.test(value),
    "Use letters, spaces, hyphens, apostrophes or full stops in your full name.",
  )
  .refine((value) => !/\s{2,}/.test(value), "Use one space between names.");

// Stored in lower case, so "Foday_M" and "foday_m" are the same username.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames are at least 3 characters.")
  .max(30, "Usernames are at most 30 characters.")
  .regex(
    /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/,
    "Use letters, numbers, dots or underscores, starting and ending with a letter or number.",
  )
  .refine((value) => !/[._]{2}/.test(value), "Don't put two dots or underscores in a row.")
  .refine((value) => !RESERVED_USERNAMES.has(value), "That username is reserved. Try another.");

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "support",
  "help",
  "eliteskills",
  "eliteskillsacademy",
  "elitenetwork",
  "system",
  "root",
  "moderator",
  "instructor",
]);

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const profileSchema = z.object({
  fullName: fullNameSchema,
  username: z
    .union([usernameSchema, z.literal("").transform(() => null)])
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, "That phone number is too long.")
    .refine((value) => value === "" || /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/.test(value), "Enter a phone number such as +232 76 123 456.")
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional(),
  location: optionalText(80, "Keep your location under 80 characters."),
  bio: optionalText(300, "Keep your bio under 300 characters."),
});

export type ProfileInput = z.input<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(128),
  newPassword: z
    .string()
    .min(8, "Your new password must be at least 8 characters.")
    .max(128, "Your new password must be at most 128 characters."),
});

/** Initials for the avatar placeholder, e.g. "Foday Mansaray" → "FM". */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => [...part][0]?.toUpperCase() ?? "").join("");
}

export function avatarUrl(userId: string, avatarUpdatedAt: Date | string | null | undefined): string | null {
  if (!avatarUpdatedAt) return null;
  return `/api/users/${userId}/avatar?v=${new Date(avatarUpdatedAt).getTime()}`;
}
