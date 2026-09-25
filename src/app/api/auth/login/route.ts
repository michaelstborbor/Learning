import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimitOrNull } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // 10 attempts per 5 minutes per IP — generous enough for a genuine user
  // who mistypes a password a few times, tight enough to blunt casual
  // credential-stuffing. See SECURITY.md for the full rationale and the
  // documented multi-instance limitation.
  const limited = rateLimitOrNull(request, "login", { limit: 10, windowSeconds: 300 });
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong — never reveal which one, to an unauthenticated caller.
  const invalidCredentials = () =>
    NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

  if (!user) return invalidCredentials();

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) return invalidCredentials();

  if (!user.isActive) {
    return NextResponse.json(
      { error: "This account has been deactivated. Contact an administrator." },
      { status: 403 },
    );
  }

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({ id: user.id, fullName: user.fullName, role: user.role });
}
