import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES, PUBLISH_ROLES, REVIEWER_ROLES } from "@/lib/roles";
import { MobileNavToggle } from "./MobileNavToggle";
import { MouseEffects } from "./MouseEffects";

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

  const linkClass = "nav-link hover:text-brand-600";

  const navLinks = (
    <>
      <Link href="/courses" className={linkClass}>
        Courses
      </Link>
      <Link href="/opportunities" className={linkClass}>
        Opportunities
      </Link>
      {isLearnerNav && (
        <>
          <Link href="/dashboard" className={linkClass}>
            Dashboard
          </Link>
          <Link href="/skills" className={linkClass}>
            Skills Passport
          </Link>
          <Link href="/certificates" className={linkClass}>
            Certificates
          </Link>
          <Link href="/applications" className={linkClass}>
            My applications
          </Link>
        </>
      )}
      {isInstructor && (
        <Link href="/instructor/courses" className={linkClass}>
          My courses
        </Link>
      )}
      {isReviewer && (
        <Link href="/review" className={linkClass}>
          Review queue
        </Link>
      )}
      {isOrganization && (
        <Link href="/organization" className={linkClass}>
          Organization
        </Link>
      )}
      {isAdmin && (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      )}
      <Link href="/verify" className={linkClass}>
        Verify a certificate
      </Link>
      <Link href="/about" className={linkClass}>
        About
      </Link>
    </>
  );

  return (
    <header className="border-b border-brand-100 bg-white">
      {/* Mouse effects run site-wide from here, since the nav is on every page. */}
      <MouseEffects />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* Decorative: the visible name next to it already names the link. */}
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
          />
          <span className="font-display text-base font-bold leading-tight text-ink-900 sm:text-lg">
            EliteSkills
            <span className="hidden min-[420px]:inline"> Academy</span>
          </span>
        </Link>

        {/* Full menu from large screens up; tablets and phones get the menu icon. */}
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
