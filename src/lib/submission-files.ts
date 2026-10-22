// Project submissions can carry one uploaded spreadsheet. Only Excel
// workbooks (.xlsx, .xls) and CSV files are accepted, checked by both the
// file name and the bytes, so a renamed file of another kind is refused.

export const SUBMISSION_FILE_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;
export type SubmissionFileExtension = (typeof SUBMISSION_FILE_EXTENSIONS)[number];

/** For the file picker's `accept` attribute. */
export const SUBMISSION_FILE_ACCEPT = SUBMISSION_FILE_EXTENSIONS.join(",");

// Kept under Vercel's 4.5 MB request body limit, since the file is sent
// through the app. A beginner's workbook is far smaller than this.
export const MAX_SUBMISSION_FILE_BYTES = 4 * 1024 * 1024;

export const SUBMISSION_FILE_TYPES: Record<SubmissionFileExtension, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
};

export const WRONG_FILE_TYPE_MESSAGE = "Upload an Excel (.xlsx or .xls) or CSV (.csv) file.";

/** The accepted extension of a file name, or null for anything else. */
export function submissionFileExtension(fileName: string): SubmissionFileExtension | null {
  const lower = fileName.trim().toLowerCase();
  return SUBMISSION_FILE_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

/** Checks that the bytes really are the kind of file the name says. */
export function matchesSubmissionFile(bytes: Uint8Array, ext: SubmissionFileExtension): boolean {
  if (bytes.length === 0) return false;
  if (ext === ".xlsx") return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]); // ZIP
  if (ext === ".xls") return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // OLE2
  // CSV is plain text: no NUL bytes, and not a ZIP or OLE2 file renamed.
  const head = bytes.subarray(0, 8192);
  if (head.includes(0)) return false;
  return !startsWith(head, [0x50, 0x4b]) && !startsWith(head, [0xd0, 0xcf]);
}
