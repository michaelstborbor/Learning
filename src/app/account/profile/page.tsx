import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { AvatarEditor } from "@/components/account/AvatarEditor";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordSection } from "@/components/account/PasswordSection";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { avatarUrl } from "@/lib/profile";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true, _count: { select: { certificates: { where: { status: "ACTIVE" } } } } },
  });
  if (!user) redirect("/login");

  const memberSince = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(user.createdAt);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <Icon name="chevronLeft" size={16} /> Account settings
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900 sm:text-3xl">Your profile</h1>
        <p className="mt-1 text-ink-500">
          Member since {memberSince}
          {user.profile?.username ? ` · @${user.profile.username}` : ""}
        </p>

        <Card className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Profile photo</h2>
          <div className="mt-4">
            <AvatarEditor fullName={user.fullName} initialUrl={avatarUrl(user.id, user.profile?.avatarUpdatedAt)} />
          </div>
        </Card>

        <Card className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Personal details</h2>
          <div className="mt-4">
            <ProfileForm
              email={user.email}
              certificateCount={user._count.certificates}
              initial={{
                fullName: user.fullName,
                username: user.profile?.username ?? "",
                phone: user.profile?.phone ?? "",
                location: user.profile?.location ?? "",
                bio: user.profile?.bio ?? "",
              }}
            />
          </div>
        </Card>

        <Card className="mt-6" id="password">
          <h2 className="font-display text-lg font-semibold text-ink-900">Reset password</h2>
          <p className="mt-1 text-sm text-ink-500">Changing it signs you out on your other phones and computers.</p>
          <div className="mt-4">
            <PasswordSection email={user.email} />
          </div>
        </Card>
      </main>
    </>
  );
}
