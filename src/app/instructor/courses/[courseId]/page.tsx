import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { AddModuleForm, AddLessonForm } from "@/components/courses/ModuleLessonForms";
import { QuizBuilder } from "@/components/courses/QuizBuilder";
import { ProjectBuilder } from "@/components/courses/ProjectBuilder";
import { SubmissionsGrader } from "@/components/courses/SubmissionsGrader";
import { PublishToggle } from "@/components/courses/PublishToggle";
import { SubmitReviewButton } from "@/components/courses/SubmitReviewButton";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      quiz: { include: { questions: { include: { answers: true }, orderBy: { order: "asc" } } } },
      project: true,
    },
  });
  if (!course) notFound();
  if (!canManageCourse(session, course.instructorId)) redirect("/instructor/courses");

  const isAdmin = session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN";
  const isOwner = session.userId === course.instructorId;

  const pendingSubmissions = course.project
    ? await prisma.projectSubmission.findMany({
        where: { projectId: course.project.id, status: "PENDING" },
        include: { learner: { select: { fullName: true } } },
        orderBy: { submittedAt: "asc" },
      })
    : [];

  // Course-level analytics (Stage F3) — live queries against the same
  // tables the learner-facing pages use, not a separate tracking system.
  const [enrolmentCount, completedCount, quizAttempts, gradedSubmissions, certificateCount] =
    await Promise.all([
      prisma.enrolment.count({ where: { courseId } }),
      prisma.enrolment.count({ where: { courseId, progressPercent: 100 } }),
      course.quiz
        ? prisma.quizAttempt.findMany({ where: { quizId: course.quiz.id } })
        : Promise.resolve([]),
      course.project
        ? prisma.projectSubmission.findMany({
            where: { projectId: course.project.id, status: "GRADED" },
          })
        : Promise.resolve([]),
      prisma.certificate.count({ where: { courseId, status: "ACTIVE" } }),
    ]);

  const completionRate = enrolmentCount > 0 ? Math.round((completedCount / enrolmentCount) * 100) : 0;
  const quizPassRate =
    quizAttempts.length > 0
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
        Math.round((quizAttempts.filter((a: any) => a.passed).length / quizAttempts.length) * 100)
      : null;
  const avgProjectScore =
    gradedSubmissions.length > 0
      ? Math.round(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
          gradedSubmissions.reduce((sum: number, s: any) => sum + (s.score ?? 0), 0) /
            gradedSubmissions.length,
        )
      : null;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink-900">
                {course.title}
              </h1>
              <Badge tone={course.status === "PUBLISHED" ? "verified" : "neutral"}>
                {STATUS_LABEL[course.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">/courses/{course.slug}</p>
          </div>
          {isAdmin && (course.status === "APPROVED" || course.status === "PUBLISHED") && (
            <PublishToggle courseId={course.id} status={course.status} />
          )}
        </div>

        {course.status === "DRAFT" && course.reviewFeedback && (
          <div className="mt-4">
            <Alert tone="danger" title="Changes requested by a reviewer">
              {course.reviewFeedback}
            </Alert>
          </div>
        )}

        {isOwner && course.status === "DRAFT" && (
          <div className="mt-4">
            <SubmitReviewButton courseId={course.id} />
          </div>
        )}
        {course.status === "UNDER_REVIEW" && (
          <p className="mt-2 text-sm text-ink-500">Waiting for a content reviewer.</p>
        )}
        {course.status === "APPROVED" && !isAdmin && (
          <p className="mt-2 text-sm text-ink-500">
            Approved — an administrator needs to publish it before learners can see it.
          </p>
        )}

        <section className="mt-10 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">Analytics</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">{enrolmentCount}</p>
              <p className="text-xs text-ink-500">Enrolled</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">{completionRate}%</p>
              <p className="text-xs text-ink-500">Completion rate</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">
                {quizPassRate === null ? "—" : `${quizPassRate}%`}
              </p>
              <p className="text-xs text-ink-500">Quiz pass rate</p>
            </Card>
            <Card className="flex flex-col gap-1">
              <p className="font-display text-xl font-bold text-ink-900">{certificateCount}</p>
              <p className="text-xs text-ink-500">Certificates issued</p>
            </Card>
          </div>
          {avgProjectScore !== null && (
            <p className="mt-3 text-sm text-ink-500">
              Average graded project score: {avgProjectScore}%
            </p>
          )}
        </section>

        <section className="mt-10 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Modules &amp; lessons
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {course.modules.map((moduleItem: any, index: number) => (
              <div key={moduleItem.id} className="rounded-md border border-ink-100 p-4">
                <p className="font-medium text-ink-900">
                  {index + 1}. {moduleItem.title}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-700">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
                  {moduleItem.lessons.map((lesson: any) => (
                    <li key={lesson.id}>· {lesson.title}</li>
                  ))}
                </ul>
                <div className="mt-2">
                  <AddLessonForm moduleId={moduleItem.id} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <AddModuleForm courseId={course.id} />
          </div>
        </section>

        <section className="mt-10 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Knowledge quiz
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Tests understanding — separate from the practical project below,
            which is what actually proves competency.
          </p>
          <div className="mt-4">
            <QuizBuilder
              courseId={course.id}
              existingQuiz={
                course.quiz
                  ? {
                      title: course.quiz.title,
                      passMarkPercent: course.quiz.passMarkPercent,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
                      questions: course.quiz.questions.map((q: any) => ({
                        prompt: q.prompt,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
                        answers: q.answers.map((a: any) => ({
                          text: a.text,
                          isCorrect: a.isCorrect,
                        })),
                      })),
                    }
                  : null
              }
            />
          </div>
        </section>

        <section className="mt-10 border-t border-ink-100 pt-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Practical project
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            A rubric-graded task the learner submits. Passing this — not the
            quiz — is what demonstrates competency.
          </p>
          <div className="mt-4">
            <ProjectBuilder
              courseId={course.id}
              existingProject={
                course.project
                  ? {
                      title: course.project.title,
                      instructions: course.project.instructions,
                      rubric: course.project.rubric,
                    }
                  : null
              }
            />
          </div>
        </section>

        {course.project && (
          <section className="mt-10 border-t border-ink-100 pt-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Submissions to grade
            </h2>
            <div className="mt-4">
              <SubmissionsGrader
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
                submissions={pendingSubmissions.map((s: any) => ({
                  id: s.id,
                  learnerName: s.learner.fullName,
                  submissionUrl: s.submissionUrl,
                  notes: s.notes,
                  submittedAt: s.submittedAt.toISOString(),
                }))}
              />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
