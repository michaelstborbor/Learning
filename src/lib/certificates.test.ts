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
  quiz: {
    findUnique: vi.fn(),
  },
  quizAttempt: {
    findFirst: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
  projectSubmission: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

// Imported after the mock is registered, per vi.mock hoisting semantics.
const { maybeIssueCertificate } = await import("./certificates");

const LEARNER_ID = "learner-1";
const COURSE_ID = "course-1";

function resetAllMocks() {
  mockPrisma.certificate.findUnique.mockReset();
  mockPrisma.course.findUnique.mockReset();
  mockPrisma.enrolment.findUnique.mockReset();
  mockPrisma.quiz.findUnique.mockReset();
  mockPrisma.quizAttempt.findFirst.mockReset();
  mockPrisma.project.findUnique.mockReset();
  mockPrisma.projectSubmission.findFirst.mockReset();
  mockPrisma.$transaction.mockReset();
}

describe("maybeIssueCertificate", () => {
  beforeEach(() => {
    resetAllMocks();
    mockPrisma.course.findUnique.mockResolvedValue({ id: COURSE_ID, title: "Test Course" });
  });

  it("does nothing if a certificate already exists (never re-issues)", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce({ id: "existing-cert" });

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing if there's no enrolment at all", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce(null);

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing if lesson progress is under 100% — Rule 1/2: completion alone isn't enough, but it IS required", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 99 });

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing if the course has a quiz but no passed attempt exists", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    mockPrisma.quiz.findUnique.mockResolvedValueOnce({ id: "quiz-1" });
    mockPrisma.quizAttempt.findFirst.mockResolvedValueOnce(null); // no passing attempt
    mockPrisma.project.findUnique.mockResolvedValueOnce(null); // no project on this course

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing if the course has a project but no passing graded submission exists — THE core Rule 1/2 case: watching lessons and even passing the quiz is never enough on its own", async () => {
    mockPrisma.certificate.findUnique.mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    mockPrisma.quiz.findUnique.mockResolvedValueOnce(null); // no quiz on this course
    mockPrisma.project.findUnique.mockResolvedValueOnce({ id: "project-1" });
    mockPrisma.projectSubmission.findFirst.mockResolvedValueOnce(null); // no passing submission

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("issues a certificate when completion + quiz + project all pass, and writes an audit log entry", async () => {
    mockPrisma.certificate.findUnique
      .mockResolvedValueOnce(null) // existing-certificate check
      .mockResolvedValueOnce(null); // certificate-number uniqueness check
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    mockPrisma.quiz.findUnique.mockResolvedValueOnce({ id: "quiz-1" });
    mockPrisma.quizAttempt.findFirst.mockResolvedValueOnce({ id: "attempt-1", passed: true });
    mockPrisma.project.findUnique.mockResolvedValueOnce({ id: "project-1" });
    mockPrisma.projectSubmission.findFirst.mockResolvedValueOnce({ id: "submission-1", score: 85 });

    const txCertificateCreate = vi.fn().mockResolvedValue({ id: "new-cert-1" });
    const txAuditLogCreate = vi.fn().mockResolvedValue({ id: "audit-1" });
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        certificate: { create: txCertificateCreate },
        certificateAuditLog: { create: txAuditLogCreate },
      }),
    );

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(txCertificateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ learnerId: LEARNER_ID, courseId: COURSE_ID }),
      }),
    );
    // Every issuance must write an audit trail entry (Rule 6) — not an
    // optional extra, the transaction always includes both writes.
    expect(txAuditLogCreate).toHaveBeenCalledTimes(1);
    const auditCallArgs = txAuditLogCreate.mock.calls[0][0];
    expect(auditCallArgs.data.action).toBe("ISSUED");
    expect(auditCallArgs.data.performedById).toBeNull(); // system-issued, not a human
  });

  it("issues on completion alone when the course has neither a quiz nor a project", async () => {
    mockPrisma.certificate.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    mockPrisma.quiz.findUnique.mockResolvedValueOnce(null);
    mockPrisma.project.findUnique.mockResolvedValueOnce(null);

    const txCertificateCreate = vi.fn().mockResolvedValue({ id: "new-cert-2" });
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        certificate: { create: txCertificateCreate },
        certificateAuditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    );

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("retries certificate number generation on a collision rather than issuing a duplicate ID", async () => {
    mockPrisma.certificate.findUnique
      .mockResolvedValueOnce(null) // existing-certificate check
      .mockResolvedValueOnce({ id: "collides" }) // first generated number already taken
      .mockResolvedValueOnce(null); // second generated number is free
    mockPrisma.enrolment.findUnique.mockResolvedValueOnce({ progressPercent: 100 });
    mockPrisma.quiz.findUnique.mockResolvedValueOnce(null);
    mockPrisma.project.findUnique.mockResolvedValueOnce(null);

    const txCertificateCreate = vi.fn().mockResolvedValue({ id: "new-cert-3" });
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        certificate: { create: txCertificateCreate },
        certificateAuditLog: { create: vi.fn().mockResolvedValue({}) },
      }),
    );

    await maybeIssueCertificate(LEARNER_ID, COURSE_ID);

    // Three findUnique calls total: the existing-cert check, the first
    // (colliding) number check, and the second (free) number check.
    expect(mockPrisma.certificate.findUnique).toHaveBeenCalledTimes(3);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
