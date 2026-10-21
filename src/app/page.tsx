import Link from "next/link";
import { Nav } from "@/components/ui/Nav";
import { CourseCard } from "@/components/ui/CourseCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Icon, type IconName } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";

// Live counts and featured courses change after deploy.
export const dynamic = "force-dynamic";

const STEPS: { title: string; text: string; icon: IconName }[] = [
  { title: "Learn", text: "Short lessons with video, audio and readings, compressed for mobile data.", icon: "book" },
  { title: "Practice", text: "Hands-on exercises inside every module.", icon: "target" },
  { title: "Demonstrate", text: "Quizzes with instant feedback, then a real project your instructor grades.", icon: "quiz" },
  { title: "Certify", text: "Pass, and get a certificate anyone can verify online.", icon: "award" },
  { title: "Connect", text: "Apply to internships and jobs from organisations on the platform.", icon: "briefcase" },
];

function HeroPreview() {
  // A still of the real product UI: what a learner sees mid-course.
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="rotate-[-2deg] rounded-3xl bg-white p-5 text-ink-900 shadow-overlay">
        <p className="text-xs font-medium text-ink-500">Module 2 · Lesson 3 of 6</p>
        <p className="mt-1 font-display text-lg font-bold">Formulas and Functions</p>
        <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-ink-900">
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(45_212_191/0.35),transparent_60%)]">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-brand-700">
              <Icon name="play" size={24} />
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Icon name="video" size={14} /> 6:40 · 9.8 MB
          </span>
          <span className="inline-flex items-center gap-1 text-brand-700">
            <Icon name="check" size={14} /> 2 of 6 done
          </span>
        </div>
      </div>
      <div className="absolute -bottom-10 -right-2 flex rotate-[3deg] items-center gap-3 rounded-2xl bg-white p-3 pr-5 text-ink-900 shadow-overlay sm:-right-10">
        <ProgressRing value={86} size={56} stroke={6} />
        <div>
          <p className="font-display font-bold">Quiz passed</p>
          <p className="text-xs text-ink-500">12/14 points</p>
        </div>
      </div>
      <div className="absolute -left-3 -top-6 flex rotate-[-4deg] items-center gap-2 rounded-2xl bg-white px-3 py-2 text-ink-900 shadow-overlay sm:-left-10">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-highlight-100 text-highlight-500">
          <Icon name="flame" size={18} />
        </span>
        <span className="font-display text-sm font-bold">5-day streak</span>
      </div>
    </div>
  );
}

export default async function Home() {
  const [courseCount, learnerCount, certificateCount, featured] = await Promise.all([
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count({ where: { role: "LEARNER", isActive: true } }),
    prisma.certificate.count({ where: { status: "ACTIVE" } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        modules: { select: { _count: { select: { lessons: true } } } },
        project: { select: { skillId: true } },
      },
    }),
  ]);

  return (
    <>
      <Nav />
      <main className="w-full flex-1">
        <section className="signal-field overflow-hidden text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
            <div>
              <h1 className="font-display text-[clamp(2.5rem,1.6rem+3.4vw,4rem)] font-bold leading-[1.02] tracking-tight text-white">
                Learn practical skills.
                <br />
                Prove what you can do.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-brand-100">
                Free courses built for phones and slow connections, starting in Sierra Leone. Watch, listen or read,
                test yourself, then show employers a certificate they can check.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-action-500 px-6 font-semibold text-white shadow-lg hover:bg-action-600"
                >
                  Get started free
                </Link>
                <Link
                  href="/courses"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white/10 px-6 font-semibold text-white ring-1 ring-white/25 hover:bg-white/15"
                >
                  Browse courses
                </Link>
              </div>
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
                {[
                  { value: courseCount, label: "free courses" },
                  { value: learnerCount, label: "learners" },
                  { value: certificateCount, label: "certificates issued" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block font-display text-3xl font-bold tabular-nums text-white">
                        {stat.value.toLocaleString("en-GB")}
                      </span>
                      <span className="text-sm text-brand-200">{stat.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="max-w-xl font-display text-3xl font-bold text-ink-900">
            Finishing a video isn&apos;t the same as being able to do the job
          </h2>
          <p className="mt-3 max-w-2xl text-ink-500">
            Every course follows the same five steps, so what you earn here means something.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-raised">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name={step.icon} />
                  </span>
                  <span className="font-display text-sm font-bold text-ink-300">{i + 1}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {featured.length > 0 && (
          <section className="border-y border-brand-100 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-16">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-3xl font-bold text-ink-900">New courses</h2>
                <Link href="/courses" className="text-sm font-semibold text-brand-600 hover:underline">
                  See all {courseCount} courses
                </Link>
              </div>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((course) => (
                  <Link key={course.id} href={`/courses/${course.slug}`} className="rounded-xl">
                    <CourseCard
                      title={course.title}
                      category={course.category}
                      level={course.level}
                      description={course.description}
                      durationLabel={`${course.estimatedHours}h`}
                      lessonCount={course.modules.reduce((sum, m) => sum + m._count.lessons, 0)}
                      certificateEligible={Boolean(course.project?.skillId)}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-3">
            {[
              {
                icon: "signal" as const,
                title: "Light on data",
                text: "Videos are compressed to 720p and audio to a few megabytes before they reach you. Download readings to study offline.",
              },
              {
                icon: "flame" as const,
                title: "A reason to come back",
                text: "Streaks, a weekly goal and a clear next lesson every time you open the app.",
              },
              {
                icon: "chart" as const,
                title: "Feedback you can use",
                text: "Quizzes mark themselves and explain the answer. Your grades and progress are always one tap away.",
              },
            ].map((item) => (
              <div key={item.title}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-highlight-100 text-highlight-700">
                  <Icon name={item.icon} size={24} />
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-ink-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
