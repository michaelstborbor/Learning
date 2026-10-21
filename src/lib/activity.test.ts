import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const { computeStreak, lastSevenDays } = await import("./activity");

const NOW = new Date("2026-03-10T15:00:00Z");

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(new Set(["2026-03-10", "2026-03-09", "2026-03-08"]), NOW)).toBe(3);
  });

  it("keeps a streak alive until a full day is missed", () => {
    expect(computeStreak(new Set(["2026-03-09", "2026-03-08"]), NOW)).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(computeStreak(new Set(["2026-03-08", "2026-03-07"]), NOW)).toBe(0);
  });

  it("stops counting at the first gap", () => {
    expect(computeStreak(new Set(["2026-03-10", "2026-03-08"]), NOW)).toBe(1);
  });
});

describe("lastSevenDays", () => {
  it("returns seven days oldest first, ending today", () => {
    const week = lastSevenDays(new Set(["2026-03-10", "2026-03-04"]), NOW);
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ key: "2026-03-04", active: true });
    expect(week[6]).toMatchObject({ key: "2026-03-10", active: true, isToday: true });
    expect(week.filter((d) => d.active)).toHaveLength(2);
  });
});
