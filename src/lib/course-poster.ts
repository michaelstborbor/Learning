// URL of a course's poster image, or null when it has none. The version
// query changes with every new poster, so browsers can cache each one
// forever (see api/courses/[courseId]/poster).
export function coursePosterUrl(course: {
  id: string;
  posterKey: string | null;
  posterUpdatedAt: Date | null;
}): string | null {
  if (!course.posterKey) return null;
  return `/api/courses/${course.id}/poster?v=${course.posterUpdatedAt?.getTime() ?? 0}`;
}
