import { Nav } from "@/components/ui/Nav";

// NOTE: Deliberately not a submission form yet — there's no notification
// module to deliver it and no admin inbox to receive it (both arrive in a
// later stage). A form that "submits" into nothing would be exactly the
// kind of fake functionality the project brief prohibits. A real mailto
// link works today; a proper contact-request workflow replaces it later.
export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Contact us
        </h1>
        <p className="mt-4 text-ink-700">
          Have a question, or want to partner with EcoSkills Academy? Reach
          out and we&apos;ll get back to you.
        </p>
        <a
          href="mailto:hello@ecoskillsacademy.org"
          className="mt-6 inline-block font-medium text-brand-600 hover:underline"
        >
          hello@ecoskillsacademy.org
        </a>
        <p className="mt-8 text-sm text-ink-500">
          A structured contact and partnership request form is planned for a
          later build stage.
        </p>
      </main>
    </>
  );
}
