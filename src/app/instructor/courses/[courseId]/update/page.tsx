import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageCourse, canUpdateCourseContent } from "@/lib/permissions";
import { CourseDetailsEditor } from "@/components/courses/CourseDetailsEditor";
import { CourseOutline } from "@/components/courses/CourseOutline";
import { MediaManager } from "@/components/courses/MediaManager";
import { coursePosterUrl } from "@/lib/course-poster";
import { courseMinutes, formatCourseDuration } from "@/lib/course-duration";

export const metadata: Metadata = { title: "Update course" };

const SECTIONS = [
  { id: "details", label: "Details and duration" },
  { id: "content", label: "Modules and lessons" },
  { id: "media", label: "Media" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 border-t border-ink-100 pt-8">
      <h2 id={`${id}-title`} className="font-display text-xl font-semibold text-ink-900">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// Update course: one place for admins, the course's instructor and content
// reviewers to change a course that is already live, covering its details
// and duration, its modules and lessons, and its media. Quizzes, the
// project, publishing and grading stay on the full course page.
export default async function UpdateCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      media: { where: { status: "READY" }, orderBy: { createdAt: "desc" } },
      _count: { select: { enrolments: true, certificates: true } },
    },
  });
  if (!course) notFound();
  if (!canUpdateCourseContent(session, course)) {
    redirect(
      session.role === "CONTENT_REVIEWER" ? "/review" : session.role === "INSTRUCTOR" ? "/instructor/courses" : "/dashboard",
    );
  }

  const canManage = canManageCourse(session, course.instructorId);
  const isPublished = course.status === "PUBLISHED";
  const backHref = canManage ? `/instructor/courses/${course.id}` : "/review";
  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  const lessonOptions = course.modules.flatMap((m, mi) =>
    m.lessons.map((l, li) => ({ id: l.id, label: `${mi + 1}.${li + 1} ${l.title}` })),
  );
  const moduleOptions = course.modules.map((m, mi) => ({ id: m.id, label: `Module ${mi + 1}: ${m.title}` }));

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <div className="border-b border-ink-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
            >
              <Icon name="chevronLeft" size={16} /> {canManage ? "Back to the course" : "Back to reviews"}
            </Link>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold text-ink-900">Update course</h1>
                <p className="mt-1 break-words text-lg text-ink-700">{course.title}</p>
                <p className="mt-1 text-sm text-ink-500">
                  {course.modules.length} module{course.modules.length === 1 ? "" : "s"} · {lessonCount} lesson
                  {lessonCount === 1 ? "" : "s"} · {formatCourseDuration(course)}
                </p>
              </div>
              {isPublished && (
                <Link
                  href={`/courses/${course.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-400 bg-white px-4 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <Icon name="eye" size={18} /> View course page
                </Link>
              )}
            </div>
          </div>
        </div>

        <nav
          aria-label="Update sections"
          className="sticky top-[61px] z-30 border-b border-ink-100 bg-white/90 backdrop-blur"
        >
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm sm:px-6 lg:px-8">
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

        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
          {isPublished && (
            <Alert tone="info" title="This course is live. Each change goes out to learners as soon as you save it.">
              {course._count.enrolments > 0
                ? `${course._count.enrolments} learner${course._count.enrolments === 1 ? " is" : "s are"} enrolled. Lessons they've finished stay finished, and a new lesson is added to their progress as one still to do.`
                : "Nobody is enrolled yet."}
            </Alert>
          )}

          <Section
            id="details"
            title="Details and duration"
            description="What learners see in the catalogue: the title, description, poster, level and how long the course takes."
          >
            <CourseDetailsEditor
              titleLocked={course._count.certificates > 0}
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
            description="Rename a module, edit a lesson's title and text, add video or audio to any module or lesson, or add new modules and lessons."
          >
            <CourseOutline courseId={course.id} modules={course.modules} media={course.media} />
          </Section>

          <Section
            id="media"
            title="Video, audio and documents"
            description="Attach files to a lesson. They're compressed on your device before upload, so learners on mobile data download much less. Add an English or Krio transcript to each video and audio file so the AI study buddy can explain it."
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
        </div>
      </main>
    </>
  );
}
