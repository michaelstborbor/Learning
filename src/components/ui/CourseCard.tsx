import { Badge } from "./Badge";
import { Card } from "./Card";

interface CourseCardProps {
  title: string;
  category: string;
  level: string;
  durationLabel: string;
  certificateEligible?: boolean;
}

export function CourseCard({
  title,
  category,
  level,
  durationLabel,
  certificateEligible,
}: CourseCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Badge tone="brand">{category}</Badge>
        {certificateEligible && <Badge tone="verified">Certificate</Badge>}
      </div>
      <h3 className="font-display text-lg font-semibold text-ink-900">
        {title}
      </h3>
      <p className="text-sm text-ink-500">
        {level} · {durationLabel}
      </p>
    </Card>
  );
}
