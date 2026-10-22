import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { CourseCover } from "@/components/ui/CourseCover";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES } from "@/lib/roles";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";
import { coursePosterUrl } from "@/lib/course-poster";
import { formatCourseDuration } from "@/lib/course-duration";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default async function InstructorCoursesPage() {
  const session = await requireRole(COURSE_AUTHOR_ROLES);
  if (!session) redirect("/login");

  const isAdmin = session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN";

  const courses = await prisma.course.findMany({
    where: isAdmin ? {} : { instructorId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { instructor: { select: { fullName: true } } },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {isAdmin ? "All courses" : "Your courses"}
          </h1>
          <CreateCourseForm />
        </div>

        {courses.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No courses yet"
              description="Create your first course to get started."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => (
              <div
                key={course.id}
                data-fx="card"
                className="flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-raised"
              >
                <Link href={`/instructor/courses/${course.id}`} className="flex flex-1 flex-col">
                  <CourseCover
                    title={course.title}
                    posterUrl={coursePosterUrl(course)}
                    className="flex aspect-[2/1] items-start justify-end p-3"
                  >
                    <Badge tone={course.status === "PUBLISHED" ? "verified" : "neutral"}>
                      {STATUS_LABEL[course.status] ?? course.status}
                    </Badge>
                  </CourseCover>
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <p className="font-display font-semibold text-ink-900">{course.title}</p>
                    <p className="text-xs text-ink-500">
                      {isAdmin ? `by ${course.instructor.fullName} · ` : ""}
                      {course.category} · {formatCourseDuration(course)}
                    </p>
                  </div>
                </Link>
                {course.status === "PUBLISHED" && (
                  <div className="border-t border-ink-100 px-2 py-1">
                    <Link
                      href={`/instructor/courses/${course.id}/update`}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      <Icon name="pencil" size={16} /> Update course
                      <span className="sr-only">: {course.title}</span>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
