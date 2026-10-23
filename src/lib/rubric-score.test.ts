import { describe, expect, it } from "vitest";
import { rubricScore, type CheckedCriterion } from "./rubric-score";

const c = (neededToPass: boolean, result: CheckedCriterion["result"]): CheckedCriterion => ({
  criterion: "x",
  neededToPass,
  result,
  evidence: "",
});

describe("rubricScore", () => {
  it("gives 100 when everything is met", () => {
    expect(rubricScore([c(true, "met"), c(true, "met"), c(false, "met")])).toBe(100);
  });

  it("weights needed criteria 80 and extras 20", () => {
    expect(rubricScore([c(true, "met"), c(true, "met"), c(false, "not_met")])).toBe(80);
    expect(rubricScore([c(true, "met"), c(true, "partly_met"), c(false, "met")])).toBe(80);
  });

  it("stays below the pass mark when a needed criterion is missed", () => {
    expect(rubricScore([...Array(6).fill(c(true, "met")), c(true, "not_met"), c(false, "met")])).toBe(69);
  });

  it("leaves out what can't be checked", () => {
    expect(rubricScore([c(true, "met"), c(true, "cannot_check")])).toBe(100);
    expect(rubricScore([c(true, "cannot_check")])).toBeNull();
  });

  it("uses all 100 points for a rubric with one kind of criterion", () => {
    expect(rubricScore([c(false, "met"), c(false, "partly_met")])).toBe(75);
  });
});
