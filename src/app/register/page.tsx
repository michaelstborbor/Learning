import { Nav } from "@/components/ui/Nav";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

// Server component shell + client form. Nav is an async server component
// (it reads the session cookie) and can't be imported into a "use client"
// file, so the interactive part is split into its own client component.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  let inviteContext: { email: string; cohortTitle: string; courseTitle: string } | null = null;
  if (invite) {
    const invitation = await prisma.cohortInvitation.findUnique({
      where: { tokenHash: hashToken(invite) },
      include: { cohort: { include: { course: true } } },
    });
    if (invitation && !invitation.acceptedAt && invitation.expiresAt > new Date()) {
      inviteContext = {
        email: invitation.email,
        cohortTitle: invitation.cohort.title,
        courseTitle: invitation.cohort.course.title,
      };
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-2 px-4 py-16">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {inviteContext
              ? `You've been invited to join "${inviteContext.cohortTitle}" (${inviteContext.courseTitle}).`
              : "Free to join. Start learning practical skills today."}
          </p>
        </div>
        <RegisterForm
          inviteToken={inviteContext ? invite : undefined}
          lockedEmail={inviteContext?.email}
        />
      </main>
    </>
  );
}
