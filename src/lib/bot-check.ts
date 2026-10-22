import "server-only";
import { checkBotId } from "botid/server";

// Vercel BotID: an invisible check (no puzzles for learners) that tells real
// browsers from scripts. The browser side is set up in
// src/instrumentation-client.ts, which lists the same routes as
// BOT_PROTECTED_ROUTES there; a route must be in that list, or every request
// to it looks like a bot. Off Vercel (local development) it always passes.
//
// Emergency switch: set BOT_PROTECTION=off in the Vercel project's
// environment variables and redeploy to turn the check off everywhere.

/** Returns a 403 response when the request comes from a bot, else null. */
export async function rejectBots(): Promise<Response | null> {
  if (process.env.BOT_PROTECTION === "off") return null;
  let isBot = false;
  try {
    ({ isBot } = await checkBotId());
  } catch (error) {
    // If the check itself fails, let the request through: rate limits
    // still apply, and locking every learner out would be worse.
    console.error("Bot check failed", error);
  }
  if (!isBot) return null;
  return Response.json(
    { error: "We couldn't confirm you're using a normal web browser. Refresh the page and try again." },
    { status: 403 },
  );
}
