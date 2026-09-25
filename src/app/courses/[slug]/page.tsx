import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Badge } from "@/components/ui/Badge";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { EnrolButton } from "@/components/courses/EnrolButton";

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
      modules: { orderBy: { order: "asc" }, include: { lessons: true } },
      quiz: true,
      project: true,
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

  const totalLessons = course.modules.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
    (sum: number, m: any) => sum + m.lessons.length,
    0,
  );

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{course.category}</Badge>
          {course.project?.skillId && <Badge tone="verified">Certificate-eligible</Badge>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-900">
          {course.title}
        </h1>
        <p className="mt-2 text-ink-500">
          {course.level} · {course.estimatedHours}h · Taught by{" "}
          {course.instructor.fullName}
        </p>

        <p className="mt-6 text-ink-700">{course.description}</p>

        <div className="mt-8">
          <EnrolButton
            courseId={course.id}
            isLoggedIn={Boolean(session)}
            alreadyEnrolled={alreadyEnrolled}
          />
        </div>

        <div className="mt-10 border-t border-ink-100 pt-8">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            What you&apos;ll learn
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {course.modules.length} modules · {totalLessons} lessons
            {course.quiz && " · knowledge quiz"}
            {course.project && " · practical project"}
          </p>
          <ol className="mt-4 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {course.modules.map((moduleItem: any, index: number) => (
              <li key={moduleItem.id} className="rounded-md border border-ink-100 p-4">
                <p className="font-medium text-ink-900">
                  {index + 1}. {moduleItem.title}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {moduleItem.lessons.length} lesson
                  {moduleItem.lessons.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ol>
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
                name: "EcoSkills Academy",
              },
              educationalLevel: course.level,
              timeRequired: `PT${course.estimatedHours}H`,
            }),
          }}
        />
      </main>
    </>
  );
}
