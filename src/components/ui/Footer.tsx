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

// Mirrors the header: same translucent white bar, logo and name, link
// underline effect and active-page highlight, so the page is framed by one
// consistent theme top and bottom. Extra bottom padding keeps the floating
// "Support us" button from covering the footer text.
export function Footer() {
  return (
    <footer className="mt-auto border-t border-brand-100/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 lg:px-8 pt-6 pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group flex items-center gap-2.5 self-start">
            {/* Decorative: the visible name next to it already names the link. */}
            <Image
              src="/logo.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
            />
            <span className="font-display text-base font-bold leading-tight text-ink-900 sm:text-lg">
              EliteSkills Academy
            </span>
          </Link>

          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
            <NavLinks items={LINKS} layout="bar" />
          </nav>
        </div>

        <p className="border-t border-brand-100/80 pt-4 text-sm text-ink-500">
          EliteSkills Academy, by Elite Network Limited. Free and open source.
        </p>
      </div>
    </footer>
  );
}
