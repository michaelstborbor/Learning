import { ReactNode } from "react";
import clsx from "clsx";

type BadgeTone = "neutral" | "brand" | "verified" | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

// IMPORTANT: "verified" tone is reserved exclusively for demonstrated
// competency — a passed practical project, an issued certificate, a
// verified Skills Passport entry. It must never be used for "lesson
// completed" or "video watched." This visual distinction is how the product
// enforces, at a glance, that finishing content is not the same as proving
// a skill (see PHASE0_BLUEPRINT.md, Section 1.4).
const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  verified: "bg-verified-100 text-verified-700",
  danger: "bg-danger-100 text-danger-700",
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
