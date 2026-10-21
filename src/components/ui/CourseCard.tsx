import { Badge } from "./Badge";
import { CourseCover } from "./CourseCover";
import { ProgressBar } from "./ProgressBar";
import { Icon } from "./Icon";

interface CourseCardProps {
  title: string;
  category: string;
  level: string;
  durationLabel: string;
  certificateEligible?: boolean;
  description?: string;
  lessonCount?: number;
  progressPercent?: number;
}

export function CourseCard({
  title,
  category,
  level,
  durationLabel,
  certificateEligible,
  description,
  lessonCount,
  progressPercent,
}: CourseCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-raised transition-colors hover:border-brand-300">
      <CourseCover title={title} className="flex h-28 items-end justify-between p-4">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
          {category}
        </span>
        {certificateEligible && <Badge tone="verified">Certificate</Badge>}
      </CourseCover>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-lg font-semibold text-ink-900">{title}</h3>
        {description && <p className="line-clamp-2 text-sm text-ink-500">{description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Icon name="target" size={14} /> {level}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" size={14} /> {durationLabel}
          </span>
          {lessonCount !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Icon name="book" size={14} /> {lessonCount} lessons
            </span>
          )}
        </div>
        {progressPercent !== undefined && (
          <div className="pt-2">
            <ProgressBar value={progressPercent} label="Progress" />
          </div>
        )}
      </div>
    </article>
  );
}
