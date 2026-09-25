import { Nav } from "@/components/ui/Nav";
import { Alert } from "@/components/ui/Alert";

// IMPORTANT: This is a good-faith draft written for a pre-launch platform,
// not a lawyer-reviewed legal document. It is deliberately flagged as such,
// both here and in the platform footer, until real legal review happens —
// consistent with the "don't hallucinate/assume" instruction on legal
// matters. Do not remove the draft notice without an actual review.
export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Terms of service
        </h1>

        <div className="mt-6">
          <Alert tone="info" title="Draft — pending legal review">
            This is a working draft, not a finalized legal document. It
            should not be treated as legally binding until reviewed by a
            qualified professional before public launch.
          </Alert>
        </div>

        <div className="mt-8 flex flex-col gap-6 text-ink-700">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              1. What EcoSkills Academy is
            </h2>
            <p className="mt-2">
              EcoSkills Academy is a free, open-access platform for practical
              skills learning. It is not a university, does not confer
              degrees, and does not guarantee employment outcomes.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              2. Your account
            </h2>
            <p className="mt-2">
              You&apos;re responsible for keeping your account credentials
              secure and for the accuracy of the information you provide.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              3. Certificates
            </h2>
            <p className="mt-2">
              Certificates are issued by EcoSkills Academy based on
              completion and demonstrated competency criteria for each
              course. They reflect skills demonstrated on this platform and
              are not a government or institutional accreditation unless
              explicitly stated.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              4. Acceptable use
            </h2>
            <p className="mt-2">
              Don&apos;t misuse the platform — this includes attempting to
              access accounts or data that aren&apos;t yours, submitting
              someone else&apos;s work as your own, or attempting to
              circumvent assessment integrity.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              5. Changes
            </h2>
            <p className="mt-2">
              These terms may be updated as the platform develops. Material
              changes will be communicated before they take effect.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
