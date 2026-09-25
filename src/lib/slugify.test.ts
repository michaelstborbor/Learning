import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Excel for the Workplace")).toBe("excel-for-the-workplace");
  });

  it("strips characters that aren't letters, numbers, or hyphens", () => {
    expect(slugify("M&E Fundamentals!")).toBe("m-e-fundamentals");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(slugify("Data   Viz -- with Power BI")).toBe("data-viz-with-power-bi");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Leading and trailing--  ")).toBe("leading-and-trailing");
  });

  it("handles an already-slug-like input unchanged", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
  });
});
