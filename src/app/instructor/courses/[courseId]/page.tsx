import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CourseCover } from "@/components/ui/CourseCover";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse, canUpdateCourseContent } from "@/lib/permissions";
import { CourseOutline } from "@/components/courses/CourseOutline";
import { QuizzesManager } from "@/components/courses/QuizzesManager";
import { MediaManager } from "@/components/courses/MediaManager";
import { ProjectBuilder } from "@/components/courses/ProjectBuilder";
import { SubmissionsGrader } from "@/components/courses/SubmissionsGrader";
import { autoGradeAvailable, autoGradeCriteria, autoGradeStuck } from "@/lib/auto-grade";
import { PublishToggle } from "@/components/courses/PublishToggle";
import { SubmitReviewButton } from "@/components/courses/SubmitReviewButton";
import { coursePosterUrl } from "@/lib/course-poster";
import { courseMinutes } from "@/lib/course-duration";
import { CourseDetailsEditor } from "@/components/courses/CourseDetailsEditor";
import { DeleteCourseButton } from "@/components/courses/DeleteCourseButton";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const SECTIONS = [
  { id: "details", label: "Details" },
  { id: "content", label: "Lessons" },
  { id: "media", label: "Media" },
  { id: "quizzes", label: "Quizzes" },
  { id: "project", label: "Project" },
  { id: "grading", label: "Grading" },
];

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Icon name={icon} />
      </span>
      <div>
        <p className="font-display text-xl font-bold tabular-nums text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-ink-100 pt-8">
      <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ManageCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ poster?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const { poster } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      quizzes: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: {
          questions: { include: { answers: { orderBy: { id: "asc" } } }, orderBy: { order: "asc" } },
        },
      },
      project: true,
      media: { where: { status: "READY" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) notFound();
  if (!canManageCourse(session, course.instructorId)) {
    // Content reviewers can update a published course, so send them there.
    redirect(canUpdateCourseContent(session, course) ? `/instructor/courses/${course.id}/update` : "/instructor/courses");
  }

  const isAdmin = session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN";
  const isOwner = session.userId === course.instructorId;
  const quizIds = course.quizzes.map((q) => q.id);

  // Waiting for a grade, plus the most recent automatic grades so an
  // instructor can check them and change any they disagree with.
  const [pendingSubmissions, autoGraded] = course.project
    ? await Promise.all([
        prisma.projectSubmission.findMany({
          where: { projectId: course.project.id, status: "PENDING" },
          include: { learner: { select: { fullName: true } } },
          orderBy: { submittedAt: "asc" },
        }),
        prisma.projectSubmission.findMany({
          where: { projectId: course.project.id, status: "GRADED", gradedAutomatically: true },
          include: { learner: { select: { fullName: true } } },
          orderBy: { gradedAt: "desc" },
          take: 30,
        }),
      ])
    : [[], []];

  // Course-level analytics — live queries against the same tables the
  // learner-facing pages use, not a separate tracking system.
  const [enrolmentCount, completedCount, quizAttempts, certificateCount] = await Promise.all([
    prisma.enrolment.count({ where: { courseId } }),
    prisma.enrolment.count({ where: { courseId, progressPercent: 100 } }),
    quizIds.length
      ? prisma.quizAttempt.findMany({
          where: { quizId: { in: quizIds }, status: "SUBMITTED" },
          select: { quizId: true, passed: true },
        })
      : Promise.resolve([]),
    prisma.certificate.count({ where: { courseId, status: "ACTIVE" } }),
  ]);

  // Same rules the DELETE route enforces, shown up front in the dialog.
  const issuedCertificates = await prisma.certificate.count({ where: { courseId } });
  const deleteBlockedReason =
    issuedCertificates > 0
      ? "Learners have earned certificates from this course, and certificates must stay verifiable, so it can't be deleted. Ask an administrator to archive it instead."
      : enrolmentCount > 0 && !isAdmin
        ? `${enrolmentCount} learner${enrolmentCount === 1 ? " is" : "s are"} enrolled in this course, so only an administrator can delete it.`
        : null;

  const completionRate = enrolmentCount > 0 ? Math.round((completedCount / enrolmentCount) * 100) : 0;
  const quizPassRate =
    quizAttempts.length > 0
      ? Math.round((quizAttempts.filter((a) => a.passed).length / quizAttempts.length) * 100)
      : null;

  const lessonOptions = course.modules.flatMap((m, mi) =>
    m.lessons.map((l, li) => ({ id: l.id, label: `${mi + 1}.${li + 1} ${l.title}` })),
  );
  const moduleOptions = course.modules.map((m, mi) => ({ id: m.id, label: `Module ${mi + 1}: ${m.title}` }));

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <CourseCover title={course.title} posterUrl={coursePosterUrl(course)} className="text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 pt-6">
            <Link
              href="/instructor/courses"
              className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
            >
              <Icon name="chevronLeft" size={16} /> All courses
            </Link>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                    {course.category} · {course.level}
                  </span>
                  <Badge tone={course.status === "PUBLISHED" ? "verified" : "neutral"}>
                    {STATUS_LABEL[course.status]}
                  </Badge>
                </div>
                <h1 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
                  {course.title}
                </h1>
                <p className="mt-1 text-sm text-white/75">/courses/{course.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {course.status === "PUBLISHED" && (
                  <Link
                    href={`/instructor/courses/${course.id}/update`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <Icon name="pencil" size={18} /> Update course
                  </Link>
                )}
                <Link
                  href={`/instructor/courses/${course.id}/gradebook`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  <Icon name="chart" size={18} /> Gradebook
                </Link>
                <DeleteCourseButton
                  courseId={course.id}
                  courseTitle={course.title}
                  enrolmentCount={enrolmentCount}
                  blockedReason={deleteBlockedReason}
                />
                {isAdmin && (course.status === "APPROVED" || course.status === "PUBLISHED") && (
                  <div className="rounded-lg bg-white">
                    <PublishToggle courseId={course.id} status={course.status} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CourseCover>

        <nav
          aria-label="Course sections"
          className="sticky top-[61px] z-30 border-b border-ink-100 bg-white/90 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 py-2 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 rounded-lg px-3 py-2 font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:px-8 py-8">
          {course.status === "DRAFT" && course.reviewFeedback && (
            <Alert tone="danger" title="Changes requested by a reviewer">
              {course.reviewFeedback}
            </Alert>
          )}
          {isOwner && course.status === "DRAFT" && (
            <div>
              <SubmitReviewButton courseId={course.id} />
            </div>
          )}
          {course.status === "UNDER_REVIEW" && (
            <Alert tone="info" title="Waiting for a content reviewer" />
          )}
          {course.status === "APPROVED" && !isAdmin && (
            <Alert
              tone="info"
              title="Approved: an administrator needs to publish it before learners can see it."
            />
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon="users" value={String(enrolmentCount)} label="Enrolled" />
            <Stat icon="check" value={`${completionRate}%`} label="Finished all lessons" />
            <Stat icon="quiz" value={quizPassRate === null ? "None yet" : `${quizPassRate}%`} label="Quiz attempts passed" />
            <Stat icon="award" value={String(certificateCount)} label="Certificates issued" />
          </div>

          <Section
            id="details"
            title="Course details"
            description="What learners see in the catalogue: the title, poster, level and how long the course takes."
          >
            <CourseDetailsEditor
              posterFailed={poster === "failed"}
              titleLocked={issuedCertificates > 0}
              course={{
                id: course.id,
                title: course.title,
                description: course.description,
                category: course.category,
                level: course.level,
                totalMinutes: courseMinutes(course),
                posterUrl: coursePosterUrl(course),
              }}
            />
          </Section>

          <Section
            id="content"
            title="Modules and lessons"
            description="Add video or audio to any module or lesson with its button. Documents, transcripts and removing files are in Media below."
          >
            <CourseOutline courseId={course.id} modules={course.modules} media={course.media} />
          </Section>

          <Section
            id="media"
            title="Video, audio and documents"
            description="Files are compressed on your device before upload, so learners on mobile data download a fraction of the original size. Add an English or Krio transcript to each video and audio file so the AI study buddy can explain it."
          >
            <MediaManager
              courseId={course.id}
              lessons={lessonOptions}
              modules={moduleOptions}
              media={course.media.map((m) => ({
                id: m.id,
                kind: m.kind,
                title: m.title,
                fileName: m.fileName,
                sizeBytes: m.sizeBytes,
                originalSizeBytes: m.originalSizeBytes,
                durationSeconds: m.durationSeconds,
                lessonId: m.lessonId,
                moduleId: m.moduleId,
                transcript: m.transcript,
                transcriptLanguage: m.transcriptLanguage,
              }))}
            />
          </Section>

          <Section
            id="quizzes"
            title="Quizzes"
            description="Knowledge checks after a module or at the end of the course, graded automatically. Quiz scores count toward the course grade, and learners need a course grade of at least 70% to earn the certificate."
          >
            <QuizzesManager
              courseId={course.id}
              modules={course.modules.map((m) => ({ id: m.id, title: m.title }))}
              quizzes={course.quizzes.map((quiz) => {
                const attempts = quizAttempts.filter((a) => a.quizId === quiz.id);
                return {
                  id: quiz.id,
                  title: quiz.title,
                  description: quiz.description ?? "",
                  moduleId: quiz.moduleId ?? "",
                  passMarkPercent: quiz.passMarkPercent,
                  timeLimitMinutes: quiz.timeLimitMinutes,
                  maxAttempts: quiz.maxAttempts,
                  shuffleQuestions: quiz.shuffleQuestions,
                  showAnswers: quiz.showAnswers,
                  weight: quiz.weight,
                  attemptCount: attempts.length,
                  passRate: attempts.length
                    ? Math.round((attempts.filter((a) => a.passed).length / attempts.length) * 100)
                    : null,
                  questions: quiz.questions.map((q) => ({
                    type: q.type,
                    prompt: q.prompt,
                    points: q.points,
                    explanation: q.explanation ?? "",
                    answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
                  })),
                };
              })}
            />
          </Section>

          <Section
            id="project"
            title="Practical project"
            description="A rubric-graded task the learner submits. Passing this, not the quizzes, is what demonstrates competency."
          >
            <ProjectBuilder
              courseId={course.id}
              existingProject={
                course.project
                  ? {
                      title: course.project.title,
                      instructions: course.project.instructions,
                      rubric: course.project.rubric,
                      weight: course.project.weight,
                      autoGrade: course.project.autoGrade,
                    }
                  : null
              }
              autoGradeAvailable={autoGradeAvailable()}
            />
          </Section>

          <Section
            id="grading"
            title="Submissions to grade"
            description="Submissions are marked against the rubric automatically when they arrive; check those grades here and change any you disagree with. Course grades combine each learner's best quiz scores and their project score, using the weights you set."
          >
            {course.project ? (
              <SubmissionsGrader
                canRetryAutoGrade={course.project.autoGrade && autoGradeAvailable()}
                submissions={[...pendingSubmissions, ...autoGraded].map((s) => ({
                  id: s.id,
                  learnerName: s.learner.fullName,
                  submissionUrl: s.submissionUrl,
                  fileName: s.fileName,
                  notes: s.notes,
                  submittedAt: s.submittedAt.toISOString(),
                  status: s.status,
                  score: s.score,
                  feedback: s.feedback,
                  autoGradeStatus: s.autoGradeStatus,
                  autoGradeNote: s.autoGradeNote,
                  autoGradeStuck: autoGradeStuck(s.autoGradeStatus, s.autoGradeStartedAt),
                  criteria: autoGradeCriteria(s.autoGradeDetails),
                }))}
              />
            ) : (
              <p className="text-sm text-ink-500">Add a practical project to receive submissions.</p>
            )}
            <Link
              href={`/instructor/courses/${course.id}/gradebook`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              Open the gradebook <Icon name="arrowRight" size={16} />
            </Link>
          </Section>
        </div>
      </main>
    </>
  );
}
