import "server-only";
import { ResendProvider } from "./resend-provider";
import type { EmailMessage } from "./types";

const provider = new ResendProvider();

/** The one function business logic should ever call to send an email.
 * Swapping providers means changing the line above, not every call site. */
export async function sendEmail(message: EmailMessage): Promise<{ id: string } | null> {
  return provider.send(message);
}

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

// Deliberately plain, minimal-HTML templates — most email clients strip
// or mangle complex CSS, and a low-bandwidth-conscious product shouldn't
// send heavy emails anyway. A text version is always included alongside
// the HTML.

export function buildVerificationEmail(fullName: string, token: string): EmailMessage {
  const link = `${baseUrl()}/api/auth/verify-email?token=${token}`;
  return {
    to: "",
    subject: "Verify your EcoSkills Academy email",
    html: `<p>Hi ${fullName},</p><p>Confirm your email address to finish setting up your account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${fullName},\n\nConfirm your email address:\n${link}\n\nThis link expires in 24 hours.`,
  };
}

export function buildPasswordResetEmail(fullName: string, token: string): EmailMessage {
  const link = `${baseUrl()}/reset-password?token=${token}`;
  return {
    to: "",
    subject: "Reset your EcoSkills Academy password",
    html: `<p>Hi ${fullName},</p><p>Someone requested a password reset for this account. If that was you, set a new password here:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
    text: `Hi ${fullName},\n\nReset your password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}

export function buildCohortInviteEmail(
  cohortTitle: string,
  courseTitle: string,
  organizationName: string,
  token: string,
): EmailMessage {
  const link = `${baseUrl()}/register?invite=${token}`;
  return {
    to: "",
    subject: `You're invited to join ${cohortTitle} on EcoSkills Academy`,
    html: `<p>${organizationName} has invited you to join the "${cohortTitle}" cohort for ${courseTitle} on EcoSkills Academy.</p><p>Create your free account to get started:</p><p><a href="${link}">${link}</a></p><p>This invite expires in 7 days.</p>`,
    text: `${organizationName} has invited you to join "${cohortTitle}" (${courseTitle}) on EcoSkills Academy.\n\nCreate your account:\n${link}\n\nThis invite expires in 7 days.`,
  };
}
