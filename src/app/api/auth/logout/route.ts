import { NextResponse } from "next/server";
import { clearSession, getSession, revokeAllSessions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.everywhere === true) {
    const session = await getSession();
    if (session) await revokeAllSessions(session.userId);
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
