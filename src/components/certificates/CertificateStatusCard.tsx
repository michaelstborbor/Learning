import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { GetCertificateButton } from "@/components/certificates/GetCertificateButton";
import { CERTIFICATE_PASS_PERCENT, type CertificateEligibility } from "@/lib/certificate-eligibility";

/** The learner's certificate state on a course: get it, why not yet, or
 * what's left. Shown on the course page. */
export function CertificateStatusCard({
  courseId,
  eligibility,
  certificate,
}: {
  courseId: string;
  eligibility: CertificateEligibility;
  certificate: { id: string; status: "ACTIVE" | "REVOKED" } | null;
}) {
  const heading = (
    <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
      <Icon name="award" size={20} className="text-highlight-500" /> Certificate
    </h2>
  );

  if (certificate?.status === "REVOKED") {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised">
        {heading}
        <p className="mt-2 text-sm text-ink-500">
          Your certificate for this course was revoked. Contact us if you think this is a mistake.
        </p>
      </div>
    );
  }

  if (certificate || eligibility.status === "qualified") {
    return (
      <div className="rounded-2xl border-2 border-highlight-500 bg-highlight-100/40 p-4 shadow-raised">
        {heading}
        <p className="mt-2 text-sm text-ink-700">
          {eligibility.percent !== null
            ? `You passed with a course grade of ${eligibility.percent}%. Well done!`
            : "You completed every lesson. Well done!"}
        </p>
        <div className="mt-3">
          {certificate ? (
            <Link
              href={`/certificates/${certificate.id}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-action-500 px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgb(194_65_12/0.7)] hover:bg-action-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600"
            >
              <Icon name="award" size={18} /> Get your certificate
            </Link>
          ) : (
            <GetCertificateButton courseId={courseId} />
          )}
        </div>
      </div>
    );
  }

  if (eligibility.status === "not-qualified") {
    return (
      <div className="rounded-2xl border border-danger-500 bg-danger-100 p-4 shadow-raised" role="status">
        {heading}
        <p className="mt-2 text-sm font-medium text-danger-700">
          You are not qualified to get a certificate now. Please take the quiz and project again.
        </p>
        <p className="mt-1 text-sm text-danger-700">
          Your course grade is {eligibility.percent}%. You need {CERTIFICATE_PASS_PERCENT}% or more.
        </p>
      </div>
    );
  }

  const { remaining, percent } = eligibility;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-raised">
      {heading}
      <p className="mt-2 text-sm text-ink-500">
        Reach a course grade of {CERTIFICATE_PASS_PERCENT}% or more across the quizzes and the project to get
        your certificate.
        {percent !== null && ` You're at ${percent}% so far.`}
      </p>
      {remaining.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-700">
          {remaining.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span className="shrink-0 text-xs text-ink-500">
                {item.kind === "project" && item.attempts > 0 ? "Awaiting grade" : "To do"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
