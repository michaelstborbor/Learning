import { describe, expect, it } from "vitest";
import { matchesSubmissionFile, submissionFileExtension } from "./submission-files";

describe("submissionFileExtension", () => {
  it("accepts Excel and CSV names in any case", () => {
    expect(submissionFileExtension("sales.xlsx")).toBe(".xlsx");
    expect(submissionFileExtension("Sales Tracker.XLS")).toBe(".xls");
    expect(submissionFileExtension("export.csv")).toBe(".csv");
  });

  it("refuses everything else", () => {
    expect(submissionFileExtension("notes.pdf")).toBeNull();
    expect(submissionFileExtension("macro.xlsm")).toBeNull();
    expect(submissionFileExtension("sales.xlsx.exe")).toBeNull();
    expect(submissionFileExtension("xlsx")).toBeNull();
  });
});

describe("matchesSubmissionFile", () => {
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]);
  const csv = new TextEncoder().encode("Date,Item,Amount\n2026-10-01,Rice,1500\n");

  it("matches real files", () => {
    expect(matchesSubmissionFile(zip, ".xlsx")).toBe(true);
    expect(matchesSubmissionFile(ole, ".xls")).toBe(true);
    expect(matchesSubmissionFile(csv, ".csv")).toBe(true);
  });

  it("refuses renamed or empty files", () => {
    expect(matchesSubmissionFile(csv, ".xlsx")).toBe(false);
    expect(matchesSubmissionFile(zip, ".xls")).toBe(false);
    expect(matchesSubmissionFile(zip, ".csv")).toBe(false);
    expect(matchesSubmissionFile(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0]), ".csv")).toBe(false);
    expect(matchesSubmissionFile(new Uint8Array(), ".csv")).toBe(false);
  });
});
