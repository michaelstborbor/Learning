import { initBotId } from "botid/client/core";

// Runs in the browser before the app becomes interactive and sets up
// Vercel BotID: requests to these routes carry a proof that they come from
// a real browser. The server side is rejectBots() in src/lib/bot-check.ts,
// which every route listed here calls.
const BOT_PROTECTED_ROUTES = [
  { path: "/api/auth/login", method: "POST" },
  { path: "/api/auth/register", method: "POST" },
  { path: "/api/auth/forgot-password", method: "POST" },
  { path: "/api/auth/reset-password", method: "POST" },
  { path: "/api/courses/*/tutor", method: "POST" },
];

// If the browser check can't finish (its script fails to load on a dropped
// connection, for example), BotID would fail the request or hold it
// forever. Instead the request goes ahead without the proof, at once or
// after this long, so the person always gets a clear answer from the
// server rather than a spinner that never stops.
const CHALLENGE_TIMEOUT_MS = 15_000;

function isProtected(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = new URL(input instanceof Request ? input.url : input, location.href);
  if (url.origin !== location.origin) return false;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  return BOT_PROTECTED_ROUTES.some(
    (route) =>
      route.method === method &&
      new RegExp(`^${route.path.replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").split("*").join("[^/]+")}$`).test(url.pathname),
  );
}

function setUpBotProtection() {
  const nativeFetch = window.fetch.bind(window);
  // BotID hands the request to this function once its check is done, so
  // reaching it means the request is really on its way.
  const sent = new WeakSet<AbortSignal>();
  window.fetch = (input, init) => {
    if (init?.signal) sent.add(init.signal);
    return nativeFetch(input, init);
  };

  initBotId({ protect: BOT_PROTECTED_ROUTES });
  const botFetch = window.fetch;

  window.fetch = (input, init) => {
    if (!isProtected(input, init)) return botFetch(input, init);

    const controller = new AbortController();
    init?.signal?.addEventListener("abort", () => controller.abort(init.signal?.reason), { once: true });
    const guarded = botFetch(input, { ...init, signal: controller.signal });

    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (sent.has(controller.signal)) return;
        // Stop the stuck check from sending a second copy later, ask BotID
        // to reload its script next time, and send this one plainly.
        controller.abort();
        guarded.catch(() => {});
        window.dispatchEvent(new Event("online"));
        nativeFetch(input, init).then(resolve, reject);
      }, CHALLENGE_TIMEOUT_MS);
      guarded.then(
        (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        (error) => {
          clearTimeout(timer);
          if (sent.has(controller.signal) || controller.signal.aborted) {
            reject(error);
            return;
          }
          // The check's script failed to load. Reload it on the next try,
          // and send this request plainly so the server gives a clear answer.
          window.dispatchEvent(new Event("online"));
          nativeFetch(input, init).then(resolve, reject);
        },
      );
    });
  };
}

// Only on the real site: in local development the server accepts every
// request anyway, and the check's script is served by Vercel. Setting
// BOT_PROTECTION=off on Vercel turns it off on both sides.
if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_BOT_PROTECTION !== "off") {
  try {
    setUpBotProtection();
  } catch (error) {
    console.error("Bot protection couldn't start", error);
  }
}
