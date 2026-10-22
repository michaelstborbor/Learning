import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { avatarUrl } from "@/lib/profile";
import { COURSE_AUTHOR_ROLES, PUBLISH_ROLES, REVIEWER_ROLES } from "@/lib/roles";
import { AccountMenu } from "./AccountMenu";
import { MobileNavToggle } from "./MobileNavToggle";
import { MouseEffects } from "./MouseEffects";
import { NavLinks, type NavItem } from "./NavLinks";

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
  const account = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { fullName: true, email: true, profile: { select: { avatarUpdatedAt: true } } },
      })
    : null;

  // Kept to a handful per role; secondary pages (verify, about, help) live
  // in the footer so the bar stays scannable.
  const items: NavItem[] = [{ href: "/", label: "Home" }];
  if (isLearnerNav) {
    items.push(
      { href: "/dashboard", label: "Dashboard" },
      { href: "/courses", label: "Courses" },
      { href: "/grades", label: "Grades" },
      { href: "/skills", label: "Skills Passport" },
      { href: "/certificates", label: "Certificates" },
      { href: "/opportunities", label: "Opportunities" },
    );
  } else {
    items.push({ href: "/courses", label: "Courses" });
    if (isInstructor) items.push({ href: "/instructor/courses", label: "My courses" });
    if (isReviewer) items.push({ href: "/review", label: "Review queue" });
    if (isOrganization) items.push({ href: "/organization", label: "Organization" });
    if (isAdmin) items.push({ href: "/admin", label: "Admin" });
    items.push({ href: "/opportunities", label: "Opportunities" });
    if (!session) items.push({ href: "/about", label: "About" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      {/* Mouse effects run site-wide from here, since the nav is on every page. */}
      <MouseEffects />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
        <Link href={session ? (isLearnerNav ? "/dashboard" : "/") : "/"} className="group flex items-center gap-2.5">
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
        <nav aria-label="Main" className="hidden items-center gap-5 text-sm text-ink-700 lg:flex">
          <NavLinks items={items} layout="bar" />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {session && account ? (
            <AccountMenu
              fullName={account.fullName}
              email={account.email}
              avatarUrl={avatarUrl(session.userId, account.profile?.avatarUpdatedAt)}
              showCertificates={Boolean(isLearnerNav)}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-10 items-center px-2 text-sm font-medium text-ink-700 hover:text-brand-600"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-10 items-center rounded-lg bg-action-500 px-3 py-2 text-sm font-semibold text-white hover:bg-action-600 sm:px-4"
              >
                Get started
              </Link>
            </>
          )}
          <MobileNavToggle>
            <NavLinks items={items} layout="menu" />
          </MobileNavToggle>
        </div>
      </div>
    </header>
  );
}
