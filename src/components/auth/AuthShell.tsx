import Link from "next/link";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";
import { Icon, type IconName } from "@/components/ui/Icon";

const PROMISES: { icon: IconName; text: string }[] = [
  { icon: "video", text: "Short video, audio and reading lessons that work on a phone" },
  { icon: "quiz", text: "Quizzes that show you what you got right, and why" },
  { icon: "award", text: "A practical project and a certificate employers can verify" },
];

// Split layout for the login and get-started pages: the animated logo on a
// deep teal "signal field" panel, the form on the right. On phones the
// panel collapses to a compact header so the form stays above the fold.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]">
      <section className="signal-field relative flex flex-col items-center justify-center overflow-hidden px-6 py-10 text-center text-brand-50 lg:py-16">
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-md px-2 py-1 text-sm text-brand-100 hover:text-white"
        >
          <span aria-hidden="true">←</span> Home
        </Link>
        <AnimatedLogo size="clamp(6rem, 18vw, 10rem)" />
        <p className="mt-4 max-w-sm text-brand-100">
          Learn practical skills. Prove what you can do.
        </p>
        <ul className="mt-10 hidden max-w-sm flex-col gap-4 text-left lg:flex">
          {PROMISES.map((item) => (
            <li key={item.text} className="flex items-start gap-3 text-sm text-brand-100">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-200">
                <Icon name={item.icon} size={18} />
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold text-ink-900">{title}</h1>
          <p className="mt-2 text-ink-500">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
