import Image from "next/image";
import Link from "next/link";
import { NavLinks, type NavItem } from "./NavLinks";

const LINKS: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/faqs", label: "FAQs" },
  { href: "/verify", label: "Verify a certificate" },
  { href: "/contact", label: "Contact" },
  { href: "/support", label: "Support us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/data-use", label: "Data use" },
  { href: "/terms", label: "Terms" },
];

// The page's anchor: deep teal (brand-900) under the orange highlight edge,
// with the same signal arcs as the course covers and the logo radiating from
// the corner, so the footer reads as part of the brand rather than a grey
// afterthought. Text is brand-100 and white on #0b3b38 (well above 4.5:1).
// Extra bottom padding keeps the floating "Support us" button from covering
// the footer text.
const FOOTER_BACKGROUND = {
  backgroundColor: "var(--color-brand-900)",
  backgroundImage:
    "radial-gradient(circle at 100% 100%, rgb(13 148 136 / 0.45), transparent 55%), repeating-radial-gradient(circle at 100% 100%, transparent 0 28px, rgb(94 234 212 / 0.12) 28px 29.5px)",
};

export function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-highlight-500 text-brand-100" style={FOOTER_BACKGROUND}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8 pt-8 pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2.5 self-start rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {/* Decorative: the visible name next to it already names the link.
                The white ring keeps the blue logo crisp on the dark teal. */}
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full bg-white ring-2 ring-white transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
            />
            <span className="font-display text-base font-bold leading-tight text-white sm:text-lg">
              EliteSkills Academy
            </span>
          </Link>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <NavLinks items={LINKS} layout="footer" />
          </nav>
        </div>

        <p className="border-t border-white/15 pt-4 text-sm text-brand-200">
          EliteSkills Academy, by Elite Network Limited. Free and open source.
        </p>
      </div>
    </footer>
  );
}
