import clsx from "clsx";

interface AnimatedLogoProps {
  size?: string;
  tone?: "light" | "dark";
  className?: string;
}

const WORD = "EliteSkills Academy";

// The sign-in moment (login and get-started pages). Pure CSS — no client
// JavaScript — so it plays immediately, even before hydration on a slow
// connection. Styles and the reduced-motion fallback live in globals.css.
export function AnimatedLogo({ size = "8rem", tone = "light", className }: AnimatedLogoProps) {
  return (
    <div className={clsx("flex flex-col items-center gap-5", className)}>
      <div
        className="logo-stage"
        style={{
          ["--logo-size" as string]: size,
          ["--logo-wave" as string]:
            tone === "light" ? "rgb(45 212 191 / 0.7)" : "rgb(13 148 136 / 0.55)",
        }}
      >
        <span className="logo-wave" aria-hidden="true" />
        <span className="logo-wave" aria-hidden="true" />
        <span className="logo-wave" aria-hidden="true" />
        <svg className="logo-orbit" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={tone === "light" ? "rgb(153 246 228 / 0.45)" : "rgb(13 148 136 / 0.35)"}
            strokeWidth="0.8"
            strokeDasharray="2 5"
          />
          <circle cx="50" cy="2" r="2.4" fill="#ea580c" />
        </svg>
        <div className="logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- the CSS mask reuses this exact file, and it must render before hydration */}
          <img src="/logo.png" alt="EliteSkills Academy" width={256} height={256} />
        </div>
      </div>
      <p
        className={clsx(
          "logo-word font-display text-2xl font-bold tracking-tight",
          tone === "light" ? "text-white" : "text-ink-900",
        )}
        aria-hidden="true"
      >
        {WORD.split("").map((char, i) => (
          <span key={i} style={{ ["--i" as string]: i }}>
            {char === " " ? " " : char}
          </span>
        ))}
      </p>
    </div>
  );
}
