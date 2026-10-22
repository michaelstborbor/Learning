import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CourseCover } from "@/components/ui/CourseCover";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { EnrolButton } from "@/components/courses/EnrolButton";
import { formatCourseDuration, isoCourseDuration } from "@/lib/course-duration";
import { coursePosterUrl } from "@/lib/course-poster";

// Enrolment state and course status can change after deploy — never
// frozen as a static build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, description: true, status: true },
  });
  if (!course || course.status !== "PUBLISHED") {
    return { title: "Course not found" };
  }
  return {
    title: course.title,
    description: course.description,
    openGraph: { title: course.title, description: course.description, type: "article" },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      instructor: { select: { fullName: true } },
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      quizzes: { select: { id: true, moduleId: true, title: true } },
      project: true,
      media: { where: { status: "READY" }, select: { kind: true, durationSeconds: true } },
      _count: { select: { enrolments: true } },
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    notFound();
  }

  const session = await getSession();
  let alreadyEnrolled = false;
  if (session) {
    const enrolment = await prisma.enrolment.findUnique({
      where: { learnerId_courseId: { learnerId: session.userId, courseId: course.id } },
    });
    alreadyEnrolled = Boolean(enrolment);
  }

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const videoCount = course.media.filter((m) => m.kind === "VIDEO").length;
  const audioCount = course.media.filter((m) => m.kind === "AUDIO").length;
  const documentCount = course.media.filter((m) => m.kind === "DOCUMENT").length;

  const includes: { icon: IconName; text: string }[] = [
    { icon: "book", text: `${course.modules.length} modules, ${totalLessons} lessons` },
    ...(videoCount ? [{ icon: "video" as const, text: `${videoCount} video lesson${videoCount === 1 ? "" : "s"}` }] : []),
    ...(audioCount ? [{ icon: "audio" as const, text: `${audioCount} audio lesson${audioCount === 1 ? "" : "s"}` }] : []),
    ...(documentCount ? [{ icon: "document" as const, text: `${documentCount} downloadable resource${documentCount === 1 ? "" : "s"}` }] : []),
    ...(course.quizzes.length
      ? [{ icon: "quiz" as const, text: `${course.quizzes.length} auto-graded quiz${course.quizzes.length === 1 ? "" : "zes"}` }]
      : []),
    ...(course.project ? [{ icon: "briefcase" as const, text: "A practical project, graded by your instructor" }] : []),
    ...(course.project?.skillId ? [{ icon: "award" as const, text: "A verifiable certificate when you pass" }] : []),
  ];

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <CourseCover title={course.title} posterUrl={coursePosterUrl(course)} className="text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">{course.category}</span>
                {course.project?.skillId && <Badge tone="verified">Certificate-eligible</Badge>}
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">{course.title}</h1>
              <p className="mt-4 max-w-2xl text-lg text-white/85">{course.description}</p>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
                <span className="inline-flex items-center gap-1.5"><Icon name="target" size={16} /> {course.level}</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} /> About {formatCourseDuration(course)}</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="users" size={16} /> {course._count.enrolments} enrolled</span>
              </p>
              <p className="mt-2 text-sm text-white/75">Taught by {course.instructor.fullName}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 text-ink-900 shadow-overlay">
              <p className="font-display text-2xl font-bold">Free</p>
              <p className="mt-1 text-sm text-ink-500">Learn at your own pace, on any phone.</p>
              <div className="mt-4 [&_button]:w-full">
                <EnrolButton
                  courseId={course.id}
                  isLoggedIn={Boolean(session)}
                  alreadyEnrolled={alreadyEnrolled}
                />
              </div>
            </div>
          </div>
        </CourseCover>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:px-8 py-10 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="font-display text-2xl font-semibold text-ink-900">What you&apos;ll learn</h2>
            <ol className="mt-5 flex flex-col gap-3">
              {course.modules.map((moduleItem, index) => {
                const hasQuiz = course.quizzes.some((q) => q.moduleId === moduleItem.id);
                return (
                  <li key={moduleItem.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="flex-1">
                          <span className="block font-medium text-ink-900">{moduleItem.title}</span>
                          <span className="text-sm text-ink-500">
                            {moduleItem.lessons.length} lesson{moduleItem.lessons.length === 1 ? "" : "s"}
                            {hasQuiz ? " and a quiz" : ""}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={18} className="text-ink-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <ul className="mt-3 flex flex-col gap-1 border-t border-ink-100 pt-3 pl-12 text-sm text-ink-700">
                        {moduleItem.lessons.map((lesson) => (
                          <li key={lesson.id}>{lesson.title}</li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>

          <aside>
            <h2 className="font-display text-lg font-semibold text-ink-900">This course includes</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {includes.map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-ink-700">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Structured data (schema.org Course) — SEO, Stage F6 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              name: course.title,
              description: course.description,
              provider: {
                "@type": "Organization",
                name: "EliteSkills Academy",
              },
              educationalLevel: course.level,
              timeRequired: isoCourseDuration(course),
            }).replace(/</g, "\\u003c"),
          }}
        />
      </main>
    </>
  );
}
