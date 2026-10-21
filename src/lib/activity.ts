import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day key (UTC — Sierra Leone's own time zone, so "today" matches
 * what learners see on their phones at launch). */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Consecutive active days ending today, or ending yesterday (a streak is
 * only lost once a full day passes with no learning). Pure for testing. */
export function computeStreak(activeDays: Set<string>, now: Date = new Date()): number {
  let cursor = new Date(now);
  if (!activeDays.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!activeDays.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/** The last 7 days, oldest first, each marked active or not. */
export function lastSevenDays(activeDays: Set<string>, now: Date = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * DAY_MS);
    return {
      key: dayKey(date),
      label: date.toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "UTC" }),
      active: activeDays.has(dayKey(date)),
      isToday: i === 6,
    };
  });
}

/** Days with any real learning activity: a lesson completed, a quiz
 * submitted, or a project handed in. Looks back 120 days. */
export async function getLearningActivity(learnerId: string) {
  const since = new Date(Date.now() - 120 * DAY_MS);
  const [lessons, attempts, submissions] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { learnerId, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { learnerId, status: "SUBMITTED", attemptedAt: { gte: since } },
      select: { attemptedAt: true, submittedAt: true },
    }),
    prisma.projectSubmission.findMany({
      where: { learnerId, submittedAt: { gte: since } },
      select: { submittedAt: true },
    }),
  ]);

  const days = new Set<string>();
  lessons.forEach((l) => days.add(dayKey(l.completedAt)));
  attempts.forEach((a) => days.add(dayKey(a.submittedAt ?? a.attemptedAt)));
  submissions.forEach((s) => days.add(dayKey(s.submittedAt)));

  const now = new Date();
  const weekStart = now.getTime() - 6 * DAY_MS;
  return {
    streak: computeStreak(days, now),
    week: lastSevenDays(days, now),
    lessonsThisWeek: lessons.filter((l) => l.completedAt.getTime() >= weekStart).length,
    activeToday: days.has(dayKey(now)),
  };
}
