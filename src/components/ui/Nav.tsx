import Link from "next/link";
import { getSession } from "@/lib/auth";
import { COURSE_AUTHOR_ROLES, PUBLISH_ROLES, REVIEWER_ROLES } from "@/lib/roles";

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

  return (
    <header className="border-b border-ink-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display text-lg font-bold text-brand-600"
        >
          EcoSkills Academy
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-700 sm:flex">
          <Link href="/courses" className="hover:text-ink-900">
            Courses
          </Link>
          <Link href="/opportunities" className="hover:text-ink-900">
            Opportunities
          </Link>
          {isLearnerNav && (
            <>
              <Link href="/dashboard" className="hover:text-ink-900">
                Dashboard
              </Link>
              <Link href="/skills" className="hover:text-ink-900">
                Skills Passport
              </Link>
              <Link href="/certificates" className="hover:text-ink-900">
                Certificates
              </Link>
              <Link href="/applications" className="hover:text-ink-900">
                My applications
              </Link>
            </>
          )}
          {isInstructor && (
            <Link href="/instructor/courses" className="hover:text-ink-900">
              My courses
            </Link>
          )}
          {isReviewer && (
            <Link href="/review" className="hover:text-ink-900">
              Review queue
            </Link>
          )}
          {isOrganization && (
            <Link href="/organization" className="hover:text-ink-900">
              Organization
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="hover:text-ink-900">
              Admin
            </Link>
          )}
          <Link href="/verify" className="hover:text-ink-900">
            Verify a certificate
          </Link>
          <Link href="/about" className="hover:text-ink-900">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/account"
              className="rounded-md bg-action-500 px-4 py-2 text-sm font-medium text-white hover:bg-action-600"
            >
              My account
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-700 hover:text-ink-900"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-action-500 px-4 py-2 text-sm font-medium text-white hover:bg-action-600"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
