// Course length. Courses created before hours-and-minutes were added only
// have estimatedHours, so everything reads through these helpers.

export interface CourseLength {
  durationMinutes: number | null;
  estimatedHours: number;
}

export function courseMinutes(course: CourseLength): number {
  return course.durationMinutes ?? course.estimatedHours * 60;
}

/** "45 min", "2 h", "1 h 30 min". */
export function formatCourseDuration(course: CourseLength): string {
  const total = courseMinutes(course);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

/** ISO 8601 duration for structured data, e.g. "PT1H30M". */
export function isoCourseDuration(course: CourseLength): string {
  const total = courseMinutes(course);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes || !hours ? `${minutes}M` : ""}`;
}

/** The whole-hours value stored alongside durationMinutes. */
export function hoursFromMinutes(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / 60));
}
