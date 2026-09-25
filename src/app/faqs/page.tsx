import { Nav } from "@/components/ui/Nav";

const FAQS = [
  {
    q: "Is EcoSkills Academy free?",
    a: "Yes. The platform launches free and open-access, with no payment required to enrol or learn.",
  },
  {
    q: "Do I get a certificate?",
    a: "Courses that are certificate-eligible issue a verifiable certificate once you complete the course and pass its practical project — not just for watching the lessons.",
  },
  {
    q: "Is this the same as a university degree?",
    a: "No. EcoSkills Academy teaches practical, workplace-ready skills. It's not a degree and we don't present it as equivalent to one.",
  },
  {
    q: "What if I have a slow internet connection?",
    a: "The platform is built mobile-first and optimized for low-bandwidth conditions, since that's how most of our users will access it.",
  },
  {
    q: "Is the platform open source?",
    a: "Yes, EcoSkills Academy is released under the MIT License.",
  },
];

export default function FaqsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Frequently asked questions
        </h1>
        <div className="mt-8 flex flex-col divide-y divide-ink-100">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="py-5">
              <p className="font-medium text-ink-900">{q}</p>
              <p className="mt-1 text-sm text-ink-500">{a}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
