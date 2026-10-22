import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
  { href: "/verify", label: "Verify a certificate" },
  { href: "/contact", label: "Contact" },
  { href: "/support", label: "Support us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/data-use", label: "Data use" },
  { href: "/terms", label: "Terms" },
];

// Extra bottom padding keeps the floating "Support us" button from covering
// the footer text.
export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-8 pt-8 pb-24 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          EliteSkills Academy, by Elite Network Limited. Free and open source.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-600 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
