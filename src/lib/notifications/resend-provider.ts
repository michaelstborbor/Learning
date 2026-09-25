import "server-only";
import type { EmailProvider, EmailMessage } from "./types";

// This is the ONLY file in the codebase that knows Resend's API shape.
// Business logic never imports this directly — it goes through
// src/lib/notifications/index.ts's sendEmail(), so swapping providers
// later touches one file, not every call site (per the brief's
// requirement: "Do not tightly couple notification providers to business
// logic").
export class ResendProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ id: string } | null> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM_ADDRESS;

    // Not configured — this is the expected, normal state in local dev
    // and in the sandbox this was built in (no network path to
    // api.resend.com regardless — see ARCHITECTURE.md). Log clearly and
    // return null rather than throwing, so registration/password-reset
    // flows that trigger an email never break because email itself isn't
    // set up yet.
    if (!apiKey || !from) {
      console.warn(
        `[notifications] Email not sent (RESEND_API_KEY/EMAIL_FROM_ADDRESS not set): "${message.subject}" to ${message.to}`,
      );
      return null;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      if (!res.ok) {
        console.error(`[notifications] Resend API error (${res.status}) sending to ${message.to}`);
        return null;
      }

      const data = await res.json();
      return { id: data.id };
    } catch (error) {
      console.error("[notifications] Failed to send email:", error);
      return null;
    }
  }
}
