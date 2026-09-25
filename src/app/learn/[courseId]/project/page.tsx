import { redirect, notFound } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ProjectSubmissionPanel } from "@/components/courses/ProjectSubmissionPanel";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { courseId } = await params;
  const enrolment = await prisma.enrolment.findUnique({
    where: { learnerId_courseId: { learnerId: session.userId, courseId } },
  });
  if (!enrolment) redirect(`/learn/${courseId}`);

  const project = await prisma.project.findUnique({ where: { courseId } });
  if (!project) notFound();

  const submissions = await prisma.projectSubmission.findMany({
    where: { projectId: project.id, learnerId: session.userId },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          {project.title}
        </h1>

        <div className="mt-4">
          <p className="font-medium text-ink-700">Instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-500">
            {project.instructions}
          </p>
        </div>

        <div className="mt-4">
          <p className="font-medium text-ink-700">How it&apos;s graded</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-500">
            {project.rubric}
          </p>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-6">
          <ProjectSubmissionPanel
            projectId={project.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md
            submissions={submissions.map((s: any) => ({
              id: s.id,
              submissionUrl: s.submissionUrl,
              status: s.status,
              score: s.score,
              feedback: s.feedback,
              submittedAt: s.submittedAt.toISOString(),
            }))}
          />
        </div>
      </main>
    </>
  );
}
