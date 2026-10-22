import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "@/components/ui/Nav";
import { Alert } from "@/components/ui/Alert";

export const POLICY_UPDATED = "22 October 2026";
export const CONTACT_EMAIL = "hello@ecoskillsacademy.org";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const POLICIES = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/data-use", label: "Data use policy" },
  { href: "/terms", label: "Terms and conditions" },
];

// Shared layout for the privacy policy, data use policy and terms: a
// contents list, numbered sections, and links between the three.
//
// IMPORTANT: these are good-faith drafts that describe what the platform
// actually does. They have not been reviewed by a lawyer and deliberately
// don't claim compliance with a specific data protection law. Keep the
// draft notice until a qualified professional has reviewed them.
export function LegalPage({
  title,
  intro,
  sections,
  current,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated {POLICY_UPDATED}</p>
        <div className="mt-4 max-w-[68ch] text-ink-700">{intro}</div>

        <div className="mt-6">
          <Alert tone="info" title="Draft, pending legal review">
            This describes how the platform really works, in plain language. It has not yet been
            reviewed by a lawyer.
          </Alert>
        </div>

        <nav aria-label="On this page" className="mt-8 rounded-xl border border-ink-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink-900">On this page</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-brand-600 hover:underline">
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-prose mt-10 flex flex-col gap-10 text-ink-700">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold text-ink-900">
                {i + 1}. {section.title}
              </h2>
              <div className="mt-3 flex max-w-[68ch] flex-col gap-3 leading-relaxed">{section.body}</div>
            </section>
          ))}
        </div>

        <aside className="mt-12 border-t border-ink-100 pt-6 text-sm text-ink-500">
          <p>
            Questions about this page? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {POLICIES.filter((p) => p.href !== current).map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="font-medium text-brand-600 hover:underline">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </>
  );
}

/** A bulleted list styled for the policy pages. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
