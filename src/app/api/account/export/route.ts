import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// "Download my data": everything the platform holds about the signed-in
// user, as one JSON file. Secrets (password hash, token hashes, session
// version) are never included.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log in to download your data." }, { status: 401 });

  const limit = await rateLimit(`account-export:${session.userId}`, { limit: 5, windowSeconds: 3600 });
  if (!limit.allowed) return tooManyRequests(limit, "You've downloaded your data a few times already. Try again in an hour.");

  const userId = session.userId;
  const [
    profile,
    enrolments,
    lessonProgress,
    quizAttempts,
    projectSubmissions,
    skills,
    certificates,
    cohorts,
    attendance,
    applications,
    organization,
    tutorMessages,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        profile: { select: { username: true, phone: true, location: true, bio: true, avatarUpdatedAt: true } },
      },
    }),
    prisma.enrolment.findMany({
      where: { learnerId: userId },
      select: { course: { select: { title: true } }, progressPercent: true, enrolledAt: true, completedAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { learnerId: userId },
      select: { lesson: { select: { title: true } }, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { learnerId: userId },
      select: {
        quiz: { select: { title: true } },
        status: true,
        scorePercent: true,
        passed: true,
        attemptedAt: true,
        submittedAt: true,
      },
    }),
    prisma.projectSubmission.findMany({
      where: { learnerId: userId },
      select: {
        project: { select: { title: true } },
        submissionUrl: true,
        fileName: true,
        notes: true,
        status: true,
        score: true,
        feedback: true,
        submittedAt: true,
        gradedAt: true,
      },
    }),
    prisma.learnerSkill.findMany({
      where: { learnerId: userId },
      select: { skill: { select: { name: true } }, verificationStatus: true, updatedAt: true },
    }),
    prisma.certificate.findMany({
      where: { learnerId: userId },
      select: { certificateNumber: true, course: { select: { title: true } }, status: true, issuedAt: true },
    }),
    prisma.cohortMember.findMany({
      where: { learnerId: userId },
      select: { cohort: { select: { title: true, startDate: true, endDate: true } }, joinedAt: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { learnerId: userId },
      select: { cohort: { select: { title: true } }, sessionDate: true, present: true },
    }),
    prisma.application.findMany({
      where: { learnerId: userId },
      select: { opportunity: { select: { title: true } }, coverNote: true, status: true, appliedAt: true },
    }),
    prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { name: true, description: true, website: true, createdAt: true },
    }),
    prisma.tutorMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { course: { select: { title: true } }, role: true, content: true, createdAt: true },
    }),
  ]);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile,
      enrolments,
      lessonProgress,
      quizAttempts,
      projectSubmissions,
      skills,
      certificates,
      cohorts,
      attendance,
      applications,
      organization,
      studyBuddyMessages: tutorMessages,
    },
    null,
    2,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eliteskills-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
