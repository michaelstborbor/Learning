// Installs the course packs in this folder (complete courses written as
// code) into the database. Runs at the end of every production build (see
// vercel.json) and can also be run by hand with `npm run content:install`.
//
// Safe to run any number of times: a pack whose slug already exists is
// skipped, so edits made afterwards in the instructor screens are never
// overwritten, and a course removed with "Remove course" is only re-created
// if its pack stays in PACKS below.
//
// Preview deployments share the production database, so they never write
// here: only production builds (VERCEL_ENV=production) and local runs do.
//
// Failures are logged but never fail the build: a missing course is easy to
// add later, a blocked deploy is not.

import { PrismaClient, type Prisma } from "@prisma/client";
import type { CoursePack, PackQuiz } from "./types";
import { excelForBeginners } from "./excel-for-beginners";

const PACKS: CoursePack[] = [excelForBeginners];

function quizData(quiz: PackQuiz, courseId: string, moduleId: string | null, order: number): Prisma.QuizUncheckedCreateInput {
  return {
    courseId,
    moduleId,
    title: quiz.title,
    description: quiz.description,
    passMarkPercent: 70,
    timeLimitMinutes: quiz.timeLimitMinutes ?? null,
    showAnswers: true,
    order,
    questions: {
      create: quiz.questions.map((q, qi) => ({
        type: q.type,
        prompt: q.prompt,
        explanation: q.explanation,
        points: q.type === "MULTIPLE_CHOICE" ? 2 : 1,
        order: qi,
        answers: {
          create: q.options.map((text, oi) => ({ text, isCorrect: q.correct.includes(oi) })),
        },
      })),
    },
  };
}

async function installPack(prisma: PrismaClient, pack: CoursePack, instructorId: string) {
  const existing = await prisma.course.findUnique({ where: { slug: pack.slug }, select: { id: true } });
  if (existing) {
    console.log(`[content] "${pack.title}" is already installed, skipping.`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      const skill = await tx.skill.upsert({
        where: { name: pack.skill.name },
        update: {},
        create: pack.skill,
      });

      const course = await tx.course.create({
        data: {
          slug: pack.slug,
          title: pack.title,
          description: pack.description,
          category: pack.category,
          level: pack.level,
          durationMinutes: pack.durationMinutes,
          estimatedHours: Math.max(1, Math.round(pack.durationMinutes / 60)),
          status: "PUBLISHED",
          instructorId,
          modules: {
            create: pack.modules.map((m, mi) => ({
              title: m.title,
              order: mi,
              lessons: { create: m.lessons.map((l, li) => ({ title: l.title, content: l.content, order: li })) },
            })),
          },
        },
        include: { modules: { orderBy: { order: "asc" }, select: { id: true } } },
      });

      let quizOrder = 0;
      for (let mi = 0; mi < pack.modules.length; mi++) {
        const quiz = pack.modules[mi].quiz;
        if (quiz) await tx.quiz.create({ data: quizData(quiz, course.id, course.modules[mi].id, quizOrder++) });
      }
      if (pack.finalQuiz) {
        await tx.quiz.create({ data: { ...quizData(pack.finalQuiz, course.id, null, quizOrder++), weight: 2 } });
      }

      if (pack.project) {
        await tx.project.create({
          data: { courseId: course.id, skillId: skill.id, ...pack.project },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: instructorId,
          action: "COURSE_INSTALLED",
          targetType: "Course",
          targetId: course.id,
          notes: `Installed and published from course pack "${pack.slug}".`,
        },
      });
    },
    { timeout: 60_000 },
  );

  console.log(`[content] Installed and published "${pack.title}".`);
}

async function main() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log(`[content] Skipping course packs on a ${process.env.VERCEL_ENV} build (shared database).`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    // Courses need an owner. Use the first active super admin (or platform
    // admin), who can hand the course to an instructor later.
    const owner =
      (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN", isActive: true }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.user.findFirst({ where: { role: "PLATFORM_ADMIN", isActive: true }, orderBy: { createdAt: "asc" } }));
    if (!owner) {
      console.log("[content] No active admin account yet, so no course packs were installed.");
      return;
    }
    for (const pack of PACKS) {
      try {
        await installPack(prisma, pack, owner.id);
      } catch (error) {
        console.error(`[content] Could not install "${pack.title}":`, error);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[content] Course pack install failed:", error);
});
