import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { TutorChat } from "@/components/tutor/TutorChat";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewCourseMedia } from "@/lib/media";

export const metadata: Metadata = { title: "Study buddy" };

export default async function TutorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const { lesson: lessonId } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true, title: true, instructorId: true },
  });
  if (!course) notFound();
  if (!(await canViewCourseMedia(session, course))) redirect(`/courses/${course.slug}`);

  const lesson = lessonId
    ? await prisma.lesson.findFirst({ where: { id: lessonId, module: { courseId } }, select: { id: true, title: true } })
    : null;

  return (
    <>
      <Nav />
      <main className="fixed inset-x-0 bottom-0 top-[61px] z-30 flex flex-col bg-background sm:px-6 sm:py-5 lg:px-10">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <TutorChat
            courseId={course.id}
            courseTitle={course.title}
            lessonId={lesson?.id ?? null}
            lessonTitle={lesson?.title ?? null}
            backHref={lesson ? `/learn/${course.id}/lessons/${lesson.id}` : `/learn/${course.id}`}
          />
        </div>
      </main>
    </>
  );
}
