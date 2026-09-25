import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/Nav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  NOT_ASSESSED: "Not assessed",
  IN_PROGRESS: "In progress",
  DEMONSTRATED: "Demonstrated",
  VERIFIED: "Verified",
};

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const learnerSkills = await prisma.learnerSkill.findMany({
    where: { learnerId: session.userId },
    include: { skill: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Your Skills Passport
        </h1>
        <p className="mt-1 text-ink-500">
          Every entry here is backed by a graded practical project — not just
          a course you watched.
        </p>

        {learnerSkills.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No skills yet"
              description="Complete a course's practical project and pass grading to earn your first verified skill."
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma stub in build sandbox, see ARCHITECTURE.md */}
            {learnerSkills.map((entry: any) => (
              <Card key={entry.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{entry.skill.name}</p>
                  <p className="text-sm text-ink-500">{entry.skill.category}</p>
                </div>
                <Badge
                  tone={
                    entry.verificationStatus === "DEMONSTRATED" ||
                    entry.verificationStatus === "VERIFIED"
                      ? "verified"
                      : "brand"
                  }
                >
                  {STATUS_LABEL[entry.verificationStatus]}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
