import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { ResendVerificationBanner } from "@/components/auth/ResendVerificationBanner";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { avatarUrl } from "@/lib/profile";

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

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { profile: true } });
  if (!user) {
    // Session refers to a user that no longer exists (e.g. deleted account).
    redirect("/login");
  }

  const { verify } = await searchParams;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={user.fullName} src={avatarUrl(user.id, user.profile?.avatarUpdatedAt)} size={48} />
              <div className="min-w-0">
                <p className="font-medium text-ink-900">{user.fullName}</p>
                <p className="truncate text-sm text-ink-500">{user.email}</p>
              </div>
            </div>
            <Badge tone="brand">{formatRole(user.role)}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/account/profile"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-400 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50"
            >
              <Icon name="user" size={18} /> Edit profile
            </Link>
            <Link
              href="/account/profile#password"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Icon name="key" size={18} /> Reset password
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <LogoutButton />
            <LogoutButton everywhere />
          </div>
        </Card>

        <Card className="mt-6 flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">Your data</h2>
          <p className="text-sm text-ink-500">
            Download a copy of everything EliteSkills Academy holds about you: your profile, courses,
            progress, quiz results, projects, certificates, applications and study buddy chats. See
            the <Link href="/privacy" className="font-medium text-brand-600 hover:underline">privacy policy</Link>{" "}
            and <Link href="/data-use" className="font-medium text-brand-600 hover:underline">data use policy</Link>{" "}
            for how it is used.
          </p>
          <a
            href="/api/account/export"
            download
            className="inline-flex min-h-11 w-fit items-center rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-900 hover:bg-ink-50"
          >
            Download my data
          </a>
        </Card>
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
