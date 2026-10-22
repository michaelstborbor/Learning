"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Vercel Web Analytics: counts page views and where visitors come from, to
// see which pages and courses are used. It sets no cookies and doesn't
// identify people. Before anything is sent, query strings are removed
// (they can carry password reset, email verification and invite tokens)
// and certificate numbers are cut from verify links, so no personal data
// leaves the browser. See /data-use.
function stripPersonalData(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    url.search = "";
    url.hash = "";
    if (url.pathname.startsWith("/verify/")) url.pathname = "/verify";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function PrivacyAnalytics() {
  return <Analytics beforeSend={stripPersonalData} />;
}
