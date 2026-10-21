import clsx from "clsx";

interface ProgressRingProps {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  tone?: "brand" | "verified" | "danger" | "highlight";
  label?: string;
  // Animate the fill once on mount (used for quiz results).
  animate?: boolean;
  children?: React.ReactNode;
}

const TONE: Record<NonNullable<ProgressRingProps["tone"]>, string> = {
  brand: "text-brand-600",
  verified: "text-verified-500",
  danger: "text-danger-500",
  highlight: "text-highlight-500",
};

// The signal motif as a measure: a ring that fills. Brand tone for progress
// through content; verified only for demonstrated competency (DESIGN.md).
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  tone = "brand",
  label,
  animate = false,
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-ink-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(TONE[tone], animate && "ring-animate")}
          style={{ ["--ring-circumference" as string]: `${circumference}` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <span className="font-display text-sm font-bold tabular-nums text-ink-900">
            {clamped}%
          </span>
        )}
      </div>
    </div>
  );
}
