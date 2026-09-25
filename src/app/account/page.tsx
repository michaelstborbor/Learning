import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ResendVerificationBanner } from "@/components/auth/ResendVerificationBanner";

// This is the reference pattern for every protected page from here on:
// check the session server-side, redirect if absent, and never trust
// anything the client claims about who it is. The role badge below reads
// directly from the database record, not from client state.
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    // Session refers to a user that no longer exists (e.g. deleted account).
    redirect("/login");
  }

  const { verify } = await searchParams;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Your account
        </h1>

        {verify === "success" && (
          <div className="mt-4">
            <Alert tone="success" title="Email verified" />
          </div>
        )}

        {!user.emailVerified && (
          <div className="mt-4">
            <ResendVerificationBanner />
          </div>
        )}

        <Card className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink-900">{user.fullName}</p>
              <p className="text-sm text-ink-500">{user.email}</p>
            </div>
            <Badge tone="brand">{formatRole(user.role)}</Badge>
          </div>
          <div className="border-t border-ink-100 pt-4">
            <LogoutButton />
          </div>
        </Card>

        <p className="mt-6 text-sm text-ink-500">
          Profile editing, enrolled courses, and your Skills Passport arrive
          in later build stages.
        </p>
      </main>
    </>
  );
}

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
