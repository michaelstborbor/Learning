import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Get started" };

// Server component shell + client form: the invite lookup runs on the
// server, the interactive part is its own client component.
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
    <AuthShell
      title="Create your account"
      subtitle={
        inviteContext
          ? `You've been invited to join "${inviteContext.cohortTitle}" (${inviteContext.courseTitle}).`
          : "Free to join. Start learning practical skills today."
      }
    >
      <RegisterForm
        inviteToken={inviteContext ? invite : undefined}
        lockedEmail={inviteContext?.email}
      />
    </AuthShell>
  );
}
