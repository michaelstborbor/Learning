import { Nav } from "@/components/ui/Nav";
import { Alert } from "@/components/ui/Alert";

// IMPORTANT: Same caveat as the IDTS project's governance documents —
// Sierra Leone does not yet have a fully enacted, comprehensive data
// protection law in force (only a bill in progress, as of this writing).
// This page deliberately does NOT claim compliance with a specific law
// that isn't fully in effect. It describes the privacy-by-design practices
// actually built into the platform instead. Flag for legal review before
// real user data is collected at any meaningful scale.
export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Privacy policy
        </h1>

        <div className="mt-6">
          <Alert tone="info" title="Draft — pending legal review">
            This describes our actual data practices in plain language. It
            is not a substitute for formal legal review, and does not claim
            compliance with any specific data protection law.
          </Alert>
        </div>

        <div className="mt-8 flex flex-col gap-6 text-ink-700">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              What we collect
            </h2>
            <p className="mt-2">
              To create an account, we collect your name, email address, and
              a securely hashed password — we never store your password in
              readable form. As you use the platform, we record your course
              progress, quiz and project results, and any certificates
              issued to you.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              What we don&apos;t collect
            </h2>
            <p className="mt-2">
              We only collect information the platform actually needs to
              function. We don&apos;t ask for sensitive personal information
              that isn&apos;t required for learning, assessment, or
              certification.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              How it&apos;s protected
            </h2>
            <p className="mt-2">
              Access to your data is role-based — only the roles that
              genuinely need it (e.g. your instructor, for your enrolled
              course) can see it. Sensitive actions are logged for audit
              purposes.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Your choices
            </h2>
            <p className="mt-2">
              Account deletion and data export tools are planned for a later
              build stage. Until then, contact us directly to request
              either.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
