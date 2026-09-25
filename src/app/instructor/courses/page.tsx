import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES } from "@/lib/roles";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="flex items-center justify-between">
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
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {courses.map((course: any) => (
              <Link key={course.id} href={`/instructor/courses/${course.id}`}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-900">{course.title}</p>
                    {isAdmin && (
                      <p className="text-xs text-ink-500">
                        by {course.instructor.fullName}
                      </p>
                    )}
                  </div>
                  <Badge tone={course.status === "PUBLISHED" ? "verified" : "neutral"}>
                    {STATUS_LABEL[course.status] ?? course.status}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
