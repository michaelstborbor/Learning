# Administrator Guide

Plain-language guide for running EcoSkills Academy day-to-day. No coding
knowledge needed for anything in this document.

## Getting your first admin account

There's a deliberate safety rule in this platform: nobody can make themselves
an admin by signing up — every role beyond ordinary Learner has to be granted
by an existing admin (see `SECURITY.md`). That means **the very first Super
Admin account has to be set directly in the database, once**, before anyone
can use the admin screens at all.

After you've deployed (see `DEPLOYMENT.md`) and registered a normal account
for yourself:

1. Open your database (Render's dashboard has a "Connect" button that gives
   you a `psql` shell, or use any Postgres client with your `DATABASE_URL`).
2. Run:
   ```sql
   UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'your-email@example.com';
   ```
3. Log out and back in. You now see "Admin" in the navigation.

Every admin/instructor/organization role after that first one can be granted
through the normal screens — see below.

## The admin dashboard (`/admin`)

Shows a live overview: total users, active learners, courses (and how many
are published), certificates issued, organizations, open opportunities,
overall completion rate, and quiz pass rate. Each number links to the full
list behind it.

## Granting roles and managing users (`/admin/users`)

For each user, you can:
- **Change their role** — pick from the dropdown, click "Save role." This is
  how you make someone an Instructor, Organization contact, Content
  Reviewer, or another Admin.
- **Deactivate/reactivate their account** — deactivating asks you to confirm
  first (this is deliberate, not a bug — a safeguard against accidental
  clicks).

Two things you'll notice are blocked on purpose:
- **You can't change your own account here.** Log in as a different admin if
  you genuinely need to change your own role or deactivate yourself.
- **Only a Super Admin can grant or remove the Super Admin role.** A regular
  Platform Admin can do everything else, but not that.

## Reviewing courses (`/review`)

When an instructor submits a course, it shows up here for a Content Reviewer
(or any admin) to look at — full description, module/lesson counts, and
whether it has a quiz and a practical project. You can:
- **Approve** — moves it to "Approved," ready for an admin to publish.
- **Request changes** — sends it back to the instructor as a Draft, with a
  written note explaining what needs fixing. This is required, not optional
  — you have to say what's wrong.

If a submitted course has neither a quiz nor a project, the page flags this
clearly: it can't certify anyone as-is.

## Publishing courses (`/instructor/courses` → open a course)

Once a course is "Approved," an admin sees a "Publish course" button on that
course's page. Published courses become visible on the public catalogue.
A published course can later be "Archived" the same way — this takes it off
the public catalogue without deleting anything (enrolled learners keep their
progress and certificates).

## Certificates (`/admin/certificates`)

Certificates are issued **automatically** — the system checks a learner's
real progress (100% of lessons, plus a passed quiz and passing project where
the course has them) and issues one itself. You don't issue certificates by
hand.

What you *can* do here: **revoke** an active certificate. This always
requires you to type a reason, and it's logged permanently — this is meant
for genuine cases (fraud discovered, a mistake found), not routine use.

## Organizations (`/admin/organizations`)

A read-only overview of every organization on the platform — who owns it,
how many cohorts and opportunities they've created. For an organization to
exist, someone first needs the "Organization" role (grant it via
`/admin/users`) and then create their own profile at `/organization`.

## Audit log (`/admin/audit-log`)

A record of the last 100 administrative actions — role changes, account
deactivations, course publishing/archiving, and review decisions — showing
who did what and when. Certificate issuance and revocation have their own
separate, permanent record (visible on `/admin/certificates`).

## Populating demo/sample data

If you want to see the platform with realistic content already in it
(useful for a demo or your own first walkthrough), run the seed script — see
`TESTING.md` for exactly what it creates. **Only run this against a fresh or
test database, never one with real user data.**

## Things you can't do yet (and why)

- **Delete a user's account entirely.** Only deactivate. A real deletion
  workflow needs careful design around what happens to their certificates,
  submissions, and other records — see `SECURITY.md`'s "Honest gaps."
- **Export a user's data.** Same reasoning — not yet built.
- **Set up payments.** Deliberately deferred — the platform currently runs
  free/open-access (see `PHASE0_BLUEPRINT.md`).
