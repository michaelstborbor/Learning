import { describe, expect, it } from "vitest";
import { formatCourseDuration, hoursFromMinutes, isoCourseDuration } from "./course-duration";

describe("course duration", () => {
  it("formats hours and minutes", () => {
    expect(formatCourseDuration({ durationMinutes: 90, estimatedHours: 2 })).toBe("1 h 30 min");
    expect(formatCourseDuration({ durationMinutes: 45, estimatedHours: 1 })).toBe("45 min");
    expect(formatCourseDuration({ durationMinutes: 120, estimatedHours: 2 })).toBe("2 h");
  });

  it("falls back to whole hours for older courses", () => {
    expect(formatCourseDuration({ durationMinutes: null, estimatedHours: 3 })).toBe("3 h");
  });

  it("builds ISO durations", () => {
    expect(isoCourseDuration({ durationMinutes: 90, estimatedHours: 2 })).toBe("PT1H30M");
    expect(isoCourseDuration({ durationMinutes: 120, estimatedHours: 2 })).toBe("PT2H");
    expect(isoCourseDuration({ durationMinutes: 20, estimatedHours: 1 })).toBe("PT20M");
  });

  it("rounds whole hours up", () => {
    expect(hoursFromMinutes(20)).toBe(1);
    expect(hoursFromMinutes(61)).toBe(2);
  });
});
