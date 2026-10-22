# Security, Privacy, Accessibility & Performance Review

**Stage F4 deliverable.** This is a real audit — findings backed by actual
inspection or calculation, fixes applied where the fix was in scope for this
pass, and honest flags where it wasn't. Nothing here is marked resolved
without the corresponding code change existing in this codebase.

---

## Security

### Findings and fixes

**1. No rate limiting on auth endpoints (found, fixed).**
Login, registration, password-reset requests, and verification-email resends
had no limit on attempts. Added `src/lib/rate-limit.ts` — an in-memory
sliding-window limiter — and wired it into all four endpoints:
- Login: 10 attempts / 5 minutes / IP
- Registration: 5 / 10 minutes / IP
- Forgot-password: 5 / 10 minutes / IP (this one can trigger an email to a
  third party, so it's also a guard against using the platform to spam
  someone else's inbox, not just brute-forcing)
- Resend-verification: 3 / 10 minutes / **user id** (already authenticated,
  so the account itself is the more precise key than IP)

**Honest limitation:** this only works correctly on a single server
instance — each instance has its own independent memory. For the realistic
first deployment (one instance) this is real, working protection. If the app
is ever scaled across multiple instances, this needs to move to a shared
store (Redis, e.g. via Upstash) before the limiting is trustworthy again. The
function signature is written so that swap only touches
`src/lib/rate-limit.ts`.

**2. Cohort attendance endpoint didn't verify learner IDs belonged to the
cohort (found, fixed).**
`api/cohorts/[cohortId]/attendance` trusted whatever learner IDs appeared as
keys in the request body and wrote `AttendanceRecord` rows for them directly.
An authorized org admin (or a client-side bug) could write attendance data
for a learner who was never actually a member of that cohort — a data
integrity problem, and a Rule 8 scope violation ("organizations should only
see/write their own training data"). Fixed: the route now cross-checks every
learner ID against real `CohortMember` rows for that cohort before writing
anything, and rejects the whole request with a clear error if any ID doesn't
belong.

**3. No general-purpose admin action audit trail (found, fixed).**
Rule 6 ("every important administrative action should have an audit trail")
was only actually implemented for certificates (`CertificateAuditLog`, Stage
D). Admin role/activation changes and admin course-status changes
(publish/archive/review decisions) had no trail. Added `AdminAuditLog`
(schema) + `src/lib/audit-log.ts` (`writeAuditLog()`) + a viewer at
`/admin/audit-log`, wired into: `api/admin/users/[userId]` (role/activation
changes), `api/courses/[courseId]/publish` (publish/archive), and
`api/courses/[courseId]/review` (approve/request-changes).

**4. No security response headers (found, fixed).**
Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive
`Permissions-Policy` via `next.config.ts`. Cheap, broadly supported, and
closes off clickjacking and MIME-sniffing as attack classes without any
functional cost.

**5. Password-reset timing side-channel (found, partially mitigated).**
The "user exists" branch of `forgot-password` does real work (a database
write, an email API call) that the "no such user" branch skips — a timing
difference that could theoretically let an attacker infer whether an email
is registered, despite the response body being identical either way.
Partial fix: token generation now happens unconditionally in both branches,
so the cheap work is equal. The database write and email send remain
asynchronous only in the "user exists" path — closing that gap fully would
need an artificial calibrated delay in the other branch, which wasn't judged
worth the added complexity for this stage. Flagged here rather than silently
left as a known gap.

### Reviewed and found sound (no change needed)

- **Password hashing:** bcrypt, 12 salt rounds — reasonable default.
- **Sessions:** signed JWT (jose/HS256) in an httpOnly, `Secure` (in
  production), `SameSite=Lax` cookie. Never readable by client JS.
- **CSRF:** no separate CSRF-token system exists, and that's a deliberate
  choice, not an oversight — `SameSite=Lax` cookies already block the cookie
  from being sent on a cross-site POST (the classic CSRF vector), which is
  the accepted modern baseline mitigation. A full token system would be
  meaningful additional complexity for marginal extra protection at this
  scale; worth revisiting if the app later adds a legitimate cross-site
  embedding use case that requires relaxing `SameSite`.
- **IDOR / ownership checks:** every course-, organization-, and
  submission-mutating route was checked against `canManageCourse()` or
  `canManageOrganization()` — spot-checked across all ~25 API routes during
  this audit, not just the ones changed. No route found trusting a client-
  supplied ID without an ownership or role check (attendance was the one
  exception, now fixed above).
- **SQL injection:** not applicable — every database call goes through
  Prisma's parameterized query builder; no raw SQL anywhere in the codebase.
- **XSS:** no use of `dangerouslySetInnerHTML` for HTML content anywhere in
  the codebase. **Update, Stage F6:** one legitimate use now exists — the
  course detail page injects JSON-LD structured data
  (`<script type="application/ld+json">`) via `dangerouslySetInnerHTML`, for
  SEO. This is the standard, safe pattern for JSON-LD: a script tag with
  that MIME type is parsed as JSON by search engines and browsers, never
  executed as HTML or JavaScript, so it isn't a real XSS vector the way
  injecting into page HTML would be. The data injected is `JSON.stringify()`
  of course fields (title, description, level, hours) — JSON.stringify
  escapes appropriately for JSON-embedding context. Lesson content, the one
  place genuinely-free-text user content is displayed at length, still
  renders as plain text (`whitespace-pre-wrap`), not HTML.
- **Privilege escalation:** new accounts always default to `LEARNER`
  (`api/auth/register`); only a Super Admin can grant/revoke the Super Admin
  role (`api/admin/users/[userId]`); an admin can't modify their own account
  through the user-management endpoint (no self-lockout or self-escalation
  path).
- **Error responses:** no route returns a raw server error object or stack
  trace to the client — every error response is either a validated Zod
  message or an explicit, friendly string.
- **File uploads:** not applicable yet — no object storage exists (see
  `ARCHITECTURE.md`), so there's nothing to validate. This will need
  attention (file-type/size validation, no executable uploads) when file
  storage is actually built.

---

## Privacy

### Reviewed and found sound

- Public endpoints (certificate verification, course/opportunity listings)
  expose only what's necessary for their stated purpose — a certificate
  lookup returns the learner's name (the whole point of verifying a
  credential), never their email or account details.
- Cross-organization data isolation verified: every org-scoped page and
  route checks `canManageOrganization()`; an org's cohort/opportunity data
  is never queryable by another org.
- Cohort and organization dashboards display learner names, not email
  addresses, minimizing exposure beyond what each screen actually needs.

### Honest gaps (not fixed in this pass — named, not hidden)

- **No self-service account deletion.** Deletion is still handled on request
  (see the privacy policy), because it has real cascading implications across
  roughly twenty related tables and for certificates other people rely on
  verifying. A self-service flow with anonymisation is a planned increment.
- ~~No data export tool~~ **Fixed (October 2026):** "Download my data" on the
  account page (`/api/account/export`) returns everything held about the
  user as JSON, without password or token hashes.
- **Sierra Leone data-protection legal status:** unchanged since Stage B —
  the platform's Privacy page already avoids claiming compliance with a law
  that isn't yet fully in force (see `ARCHITECTURE.md` and the Privacy page
  itself). Nothing new to add here.

---

## Accessibility

### Findings and fixes

**1. Two real WCAG 2.2 AA contrast failures, found by calculation (fixed).**
Every design-token color was checked against its actual usage context using
the WCAG relative-luminance formula, not eyeballed:

| Token | Old value | Old ratio | New value | New ratio |
|---|---|---|---|---|
| `action-500`/`600` (white button text) | `#C8860D` / `#A86C07` | ~3.06:1 (fails AA) | `#9C6209` / `#7D4E07` | ~5.04:1 / ~7.09:1 (passes) |
| `ink-500` (muted text on background) | `#71786F` | ~4.38:1 (fails AA, needs 4.5) | `#64695F` | ~5.44:1 (passes) |

The button-text failure was the more serious of the two — it affected every
primary call-to-action on the platform (Enrol, Submit, Publish, Save, Log
in/Get started in the nav). Both are fixed at the token level in
`src/app/globals.css`, so every component using them is corrected
automatically; `DESIGN.md` updated to match.

**2. No skip-to-content link (found, fixed).**
Added `src/components/ui/SkipLink.tsx` in the root layout — a standard,
visually-hidden-until-focused link that lets keyboard and screen-reader
users jump past the repeated navigation on every page straight to that
page's content. Implemented by locating the nearest `<main>` landmark at
click time (rather than requiring a matching `id="main-content"` added to
every one of the ~40 page files individually) — same accessibility outcome,
far less surface area to keep in sync as pages are added.

### Reviewed and found sound

- Every form input uses a real `<label htmlFor>` (via the shared `Field`
  component), and validation errors are wired with `aria-invalid` /
  `aria-describedby` so assistive tech announces them.
- All interactive elements are real `<button>` / `<a>` / form controls — no
  `<div onClick>` pseudo-buttons found anywhere in the codebase.
- Focus-visible states are built into the design system's `Button`, `Field`,
  and link styles from Stage 2 onward.
- `<html lang="en">` is set.
- `ProgressBar` uses proper `role="progressbar"` with `aria-valuenow` /
  `aria-valuemin` / `aria-valuemax`.
- No images exist in the app yet (no object storage — see
  `ARCHITECTURE.md`), so alt-text compliance is not yet applicable; will
  need attention once course thumbnails/media are built.
- Course/opportunity search forms are plain `<form method="GET">` —
  inherently keyboard- and screen-reader-friendly, with no custom widget
  behavior to get wrong.

---

## Performance

Reviewed against the brief's stated targets (mobile-first, low-bandwidth,
usable on constrained connections):

- **No client-side JS where a plain HTML form suffices.** Course/opportunity
  search (Stage F3) deliberately uses `<form method="GET">` rather than a
  JS-driven filter UI.
- **No external font CDN.** Headline font is self-hosted via `@fontsource`
  (Stage 2); body text uses system fonts — zero additional font-loading cost.
- **Dynamic rendering only where data actually changes** (`export const
  dynamic = "force-dynamic"` on the course catalogue, course detail, and
  opportunities pages) — the static pages (`/`, `/style-guide`) remain
  prerendered.
- **Queries are targeted, not over-fetching:** list pages use `select`/
  narrow `include` rather than pulling full nested trees where only a count
  or a name is needed (e.g. course category dropdown, organization member
  counts).
- **No image optimization work done**, because there are no images to
  optimize yet (see Accessibility, above) — deferred to whenever file
  storage and course media are built.
- **Not measured empirically.** Given the sandbox limitation (no real
  database connection — see `ARCHITECTURE.md`), actual page-load timing,
  Lighthouse scores, and behavior on a throttled connection have not been
  measured, only reasoned about from the code. This should be measured for
  real once deployed — the code choices above are aimed at good performance,
  not verified proof of it.

---

## Summary of code changes in this pass

- `src/lib/rate-limit.ts` (new), applied to `api/auth/login`,
  `api/auth/register`, `api/auth/forgot-password`,
  `api/auth/resend-verification`
- `api/cohorts/[cohortId]/attendance` — membership validation added
- `AdminAuditLog` (schema, new) + `src/lib/audit-log.ts` (new) +
  `/admin/audit-log` (new page), wired into `api/admin/users/[userId]`,
  `api/courses/[courseId]/publish`, `api/courses/[courseId]/review`
- `next.config.ts` — security headers added
- `src/app/globals.css` — `action-500`/`600` and `ink-500` corrected for
  WCAG AA contrast; `DESIGN.md` updated to match
- `src/components/ui/SkipLink.tsx` (new), added to root layout

## Verification performed

`npm run lint` and `npm run build` both clean after every change in this
pass — see `ARCHITECTURE.md`'s "Known sandbox limitation" note for what
that does and doesn't prove. As with every prior stage, real database and
runtime behavior have not been exercised in this build environment.

---

## October 2026 audit

A second full pass over every API route, page, the proxy and the headers.
Each item below was changed in code and checked in a browser against a
production build.

### Findings and fixes

1. **Sessions outlived the account's state (fixed).** The session cookie
   carried the role and was trusted for up to 7 days, so deactivating a user,
   changing their role or resetting their password had no effect on cookies
   already issued. `getSession()` (`src/lib/auth.ts`) now re-reads the account
   once per request: deactivated accounts are signed out, the role comes from
   the database, and a new `users.sessionVersion` (carried in the cookie as
   `sv`) is raised on password reset, deactivation and "Log out on all
   devices", which ends every existing session.
2. **Rate limits didn't hold on serverless hosting (fixed).** The in-memory
   limiter was per instance, and Vercel runs many. Limits now live in a
   shared Postgres table (`rate_limits`, one atomic upsert per check) with the
   in-memory limiter as a fallback if the database is unreachable. Added
   limits that were missing: per-account login (20 / 15 min), reset-password
   (10 / 10 min / IP), certificate verify API (30 / min / IP), reset emails
   per inbox (3 / hour), data export (5 / hour).
3. **Login timing revealed which emails have accounts (fixed).** An unknown
   email returned before the bcrypt check. It now runs bcrypt against a dummy
   hash, so both cases take the same time (~0.5 s, measured).
4. **Stored links could run script (fixed).** Project submission links and
   organization websites accepted any URL scheme, including `javascript:`.
   They now must be http(s) (`webUrlSchema`), and links are rendered through
   `safeHref()` so older stored values can't run either.
5. **No length limits on free text (fixed).** Most create/update schemas had
   minimums but no maximums, so one request could store megabytes. Every
   free-text field now has a sensible cap; passwords are capped at 128.
6. **Guessable certificate numbers (fixed).** They came from `Math.random()`.
   They now use `crypto.randomBytes` over an unambiguous 32-character
   alphabet (50 bits).
7. **Missing headers (fixed).** Added HSTS, a Content-Security-Policy
   (`frame-ancestors 'none'; object-src 'none'; base-uri 'self';
   form-action 'self'`, plus `upgrade-insecure-requests` on Vercel),
   `Cross-Origin-Opener-Policy: same-origin`, and removed `X-Powered-By`.
   A script allow-list is deliberately not enforced yet: Next.js, BotID and
   Vercel Analytics need inline and same-origin scripts, and a wrong list
   would break sign-in. Moving to nonce-based CSP is a follow-up.
8. **No cross-site request check (fixed).** `src/proxy.ts` now refuses
   POST/PUT/PATCH/DELETE to `/api/*` whose `Origin` is another site, on top
   of the SameSite=Lax cookie.
9. **No bot protection (fixed).** Vercel BotID guards sign-up, login,
   forgot/reset password and the study buddy (`src/lib/bot-check.ts`,
   `src/instrumentation-client.ts`). If the browser check can't load, the
   request is still sent so the server answers clearly instead of hanging.
   `BOT_PROTECTION=off` is an emergency switch. The proxy also turns away
   known attack tools by user agent and probes for files like `/.env` or
   `/wp-admin`.
10. **Course deletion (new feature, built safely).** Deleting a course needs
    the title typed back, is refused when certificates were issued, is
    admin-only when learners are enrolled, runs in one transaction, removes
    stored files afterwards and is written to the audit log.

### Privacy additions

- Vercel Web Analytics is cookieless; query strings (which can hold reset,
  verification and invite tokens) are stripped before sending.
- Admin learning insights show totals only.
- New `/data-use` page; `/privacy` and `/terms` rewritten to match what the
  platform actually does. Still marked as drafts pending legal review.
