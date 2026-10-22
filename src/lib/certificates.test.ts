import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma module entirely — this tests the ISSUANCE RULE itself
// (Rule 1/2's concrete enforcement point), not real database behavior,
// which can't be exercised in this build sandbox (see ARCHITECTURE.md).
// Each test configures exactly the data shape maybeIssueCertificate reads,
// then asserts whether a certificate was (or wasn't) created.
const mockPrisma = {
  certificate: {
    findUnique: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
  },
  enrolment: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};
const mockGetCourseGrades = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/gradebook", () => ({ getCourseGrades: mockGetCourseGrades }));

// Imported after the mocks are registered, per vi.mock hoisting semantics.
const { maybeIssueCertificate, generateCertificateNumber } = await import("./certificates");
const { computeCourseGrade } = await vi.importActual<typeof import("./gradebook")>("./gradebook");

const LEARNER_ID = "learner-1";
const COURSE_ID = "course-1";

type Item = Parameters<typeof computeCourseGrade>[0][number];
function item(id: string, score: number | null, weight = 1, kind: Item["kind"] = "quiz"): Item {
  return { id, kind, title: id, weight, score, passed: score !== null && score >= 70, attempts: score === null ? 0 : 1 };
}
function gradesWith(items: Item[]) {
  mockGetCourseGrades.mockResolvedValueOnce({ grades: new Map([[LEARNER_ID, computeCourseGrade(items)]]) });
}
function captureTransaction() {
  const txCertificateCreate = vi.fn().mockResolvedValue({ id: "new-cert", certificateNumber: "ESA-NEW" });
  const txAuditLogCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      certificate: { create: txCertificateCreate },
      certificateAuditLog: { create: txAuditLogCreate },
    }),
  );
  return { txCertificateCreate, txAuditLogCreate };
}

describe("maybeIssueCertificate", () => {
  beforeEach(() => {
    mockPrisma.certificate.findUnique.mockReset();
    mockPrisma.course.findUnique.mockReset();
    mockPrisma.enrolment.findUnique.mockReset();
    mockPrisma.$transaction.mockReset();
    mockGetCourseGrades.mockReset();
    mockPrisma.course.findUnique.mockResolvedValue({ id: COURSE_ID, title: "Test Course" });
  });

  it("returns the existing certificate and never re-issues", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce({ id: "existing-cert" });

    expect(await maybeIssueCertificate(LEARNER_ID, COURSE_ID)).toEqual({ id: "existing-cert" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing if there's no enrolment at all", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce(null);

    expect(await maybeIssueCertificate(LEARNER_ID, COURSE_ID)).toBeNull();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing while the project is still waiting for a grade", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    gradesWith([item("quiz-1", 100), item("final", 100, 2), item("project", null, 1, "project")]);

    expect(await maybeIssueCertificate(LEARNER_ID, COURSE_ID)).toBeNull();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when the course grade is under 70%", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    gradesWith([item("quiz-1", 60), item("final", 65, 2), item("project", 80, 1, "project")]); // 67.5%

    expect(await maybeIssueCertificate(LEARNER_ID, COURSE_ID)).toBeNull();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("issues at a 70% average even if one quiz alone is below 70%, and writes an audit log entry", async () => {
    mockPrisma.certificate.findUnique
      .mockResolvedValueOnce(null) // existing-certificate check
      .mockResolvedValueOnce(null); // certificate-number uniqueness check
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 40 });
    gradesWith([item("quiz-1", 50), item("final", 80, 2), item("project", 75, 1, "project")]); // 71.25%
    const { txCertificateCreate, txAuditLogCreate } = captureTransaction();

    const certificate = await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(certificate).toEqual({ id: "new-cert", certificateNumber: "ESA-NEW" });
    expect(txCertificateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ learnerId: LEARNER_ID, courseId: COURSE_ID }),
      }),
    );
    // Every issuance must write an audit trail entry (Rule 6), not an
    // optional extra: the transaction always includes both writes.
    expect(txAuditLogCreate).toHaveBeenCalledTimes(1);
    const auditCallArgs = txAuditLogCreate.mock.calls[0][0];
    expect(auditCallArgs.data.action).toBe("ISSUED");
    expect(auditCallArgs.data.performedById).toBeNull(); // system-issued, not a human
    expect(auditCallArgs.data.notes).toContain("71%");
  });

  it("issues on completion alone when the course has neither a quiz nor a project", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    gradesWith([]);
    captureTransaction();

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("retries certificate number generation on a collision rather than issuing a duplicate ID", async () => {
    mockPrisma.certificate.findUnique
      .mockResolvedValueOnce(null) // existing-certificate check
      .mockResolvedValueOnce({ id: "collides" }) // first generated number already taken
      .mockResolvedValueOnce(null); // second generated number is free
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    gradesWith([]);
    captureTransaction();

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    // Three findUnique calls total: the existing-cert check, the first
    // (colliding) number check, and the second (free) number check.
    expect(mockPrisma.certificate.findUnique).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("generateCertificateNumber", () => {
  it("uses the ESA- prefix and an unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCertificateNumber()).toMatch(/^ESA-[2-9A-HJ-NP-Z]{10}$/);
    }
  });

  it("doesn't repeat", () => {
    const numbers = new Set(Array.from({ length: 1000 }, () => generateCertificateNumber()));
    expect(numbers.size).toBe(1000);
  });
});
