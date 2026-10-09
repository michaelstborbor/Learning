import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES, PUBLISH_ROLES, REVIEWER_ROLES } from "@/lib/roles";
import { MobileNavToggle } from "./MobileNavToggle";

// Server component: reads the session cookie server-side, so the nav never
// flashes a logged-out state or trusts anything the client claims.
export async function Nav() {
  const session = await getSession();
  const isInstructor = session ? COURSE_AUTHOR_ROLES.includes(session.role) : false;
  const isAdmin = session ? PUBLISH_ROLES.includes(session.role) : false;
  const isOrganization = session ? session.role === "ORGANIZATION" : false;
  const isReviewer = session ? REVIEWER_ROLES.includes(session.role) : false;
  const isContentReviewerOnly = session?.role === "CONTENT_REVIEWER";
  const isLearnerNav = session && !isInstructor && !isOrganization && !isContentReviewerOnly;

  const navLinks = (
    <>
      <Link href="/courses" className="hover:text-brand-600">
        Courses
      </Link>
      <Link href="/opportunities" className="hover:text-brand-600">
        Opportunities
      </Link>
      {isLearnerNav && (
        <>
          <Link href="/dashboard" className="hover:text-brand-600">
            Dashboard
          </Link>
          <Link href="/skills" className="hover:text-brand-600">
            Skills Passport
          </Link>
          <Link href="/certificates" className="hover:text-brand-600">
            Certificates
          </Link>
          <Link href="/applications" className="hover:text-brand-600">
            My applications
          </Link>
        </>
      )}
      {isInstructor && (
        <Link href="/instructor/courses" className="hover:text-brand-600">
          My courses
        </Link>
      )}
      {isReviewer && (
        <Link href="/review" className="hover:text-brand-600">
          Review queue
        </Link>
      )}
      {isOrganization && (
        <Link href="/organization" className="hover:text-brand-600">
          Organization
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className="hover:text-brand-600">
          Admin
        </Link>
      )}
      <Link href="/verify" className="hover:text-brand-600">
        Verify a certificate
      </Link>
      <Link href="/about" className="hover:text-brand-600">
        About
      </Link>
    </>
  );

  return (
    <header className="border-b border-brand-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Decorative: the visible name next to it already names the link. */}
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0"
          />
          <span className="font-display text-base font-bold leading-tight text-brand-700 sm:text-lg">
            EliteSkills
            <span className="hidden min-[420px]:inline"> Academy</span>
          </span>
        </Link>

        {/* Full menu from large screens up; tablets and phones get the ☰ menu,
            because 6-8 links do not fit side by side below ~1024px. */}
        <nav className="hidden items-center gap-6 text-sm text-ink-700 lg:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link
              href="/account"
              className="rounded-md bg-action-500 px-3 py-2 text-sm font-medium text-white hover:bg-action-600 sm:px-4"
            >
              My account
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-700 hover:text-brand-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-action-500 px-3 py-2 text-sm font-medium text-white hover:bg-action-600 sm:px-4"
              >
                Get started
              </Link>
            </>
          )}
          <MobileNavToggle>{navLinks}</MobileNavToggle>
        </div>
      </div>
    </header>
  );
}
