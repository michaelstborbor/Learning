import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { spreadsheetText } from "./spreadsheet-text";

const fixture = readFileSync(join(__dirname, "__fixtures__", "sales-tracker.xlsx"));

describe("spreadsheetText", () => {
  it("reads formulas, formatting, frozen panes, page setup and charts from .xlsx", () => {
    const result = spreadsheetText(fixture, "sales-tracker.xlsx");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('Sheet "Sales"');
    expect(result.text).toContain("frozen panes: top 1 row");
    expect(result.text).toContain("orientation landscape, fit to 1 page(s) wide by 1 tall");
    expect(result.text).toContain('column chart; titled "Sales by item"');
    expect(result.text).toContain('A1: "Date" | bold, border');
    expect(result.text).toContain("E2: (result not saved in the file) | =C2*D2");
    expect(result.text).toContain('=IF(E2>=$J$1,"Yes","No")');
    expect(result.text).toContain("=SUMIF(B2:B16,H2,E2:E16)");
    expect(result.text).toContain("A2: 46296 (2026-10-01)");
  });

  it("reads CSV values and says formulas can't be in a CSV", () => {
    const csv = Buffer.from("Date,Item,Total\n2026-10-01,Rice,300\n");
    const result = spreadsheetText(csv, "sales.csv");
    expect(result.ok && result.text).toContain("2: 2026-10-01,Rice,300");
    expect(result.ok && result.text).toContain("no formulas");
  });

  it("hands old .xls and broken files to an instructor", () => {
    expect(spreadsheetText(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), "old.xls").ok).toBe(false);
    expect(spreadsheetText(Buffer.from("not a zip"), "broken.xlsx").ok).toBe(false);
  });
});
