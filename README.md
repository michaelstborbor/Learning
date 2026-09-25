# EcoSkills Academy

A free, open-source, mobile-first, low-bandwidth digital skills and career development
platform, launching first in Sierra Leone with an architecture designed to support
expansion across West Africa.

**Product philosophy:** Learn → Practice → Demonstrate → Certify → Connect

This is not a video library. Completing a lesson and demonstrating competency (via a
graded practical project) are treated as separate concepts throughout the platform.

## Status

**All planned MVP + Platform Hardening stages (A through F6) are built.** Courses,
assessments, certificates, organizations, notifications, administration, content
review, analytics, search, a real security audit, automated tests, and deployment
documentation all exist in this codebase. Payments are deliberately deferred (the
platform launches free/open-access — see `PHASE0_BLUEPRINT.md`).

**Read `PRODUCTION_READINESS.md` before deploying for real.** It's an honest final
audit, not a "everything's done" claim — in particular, this codebase has never
been run against a real database during development (a sandbox network
limitation, explained in `ARCHITECTURE.md`), so the very first real deployment
should include a full, deliberate manual test of every core flow.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Resend](https://resend.com) for transactional email
- [Vitest](https://vitest.dev/) (unit tests) + [Playwright](https://playwright.dev/) (E2E)
- Deployed as a single modular-monolith application (see `ARCHITECTURE.md`)

## Getting started (local development)

```bash
npm install
cp .env.example .env   # then fill in real values
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See `DEPLOYMENT.md` for
production setup, and `TESTING.md` for how to run the test suite and load demo data.

## License

MIT — see `LICENSE`. EcoSkills Academy is open source. Anyone may use, modify, and
redistribute this software, including commercially, provided the copyright notice
is retained.

## Documentation

**Start here if you're the non-technical founder:** `ADMIN_GUIDE.md` and
`PRODUCTION_READINESS.md`.

- `PHASE0_BLUEPRINT.md` — the original product/technical blueprint this build followed
- `ARCHITECTURE.md` — system design, every stage's reasoning, module boundaries
- `DATABASE.md` — the full data model
- `API.md` — every API route, its auth requirement, and its purpose
- `SECURITY.md` — the Stage F4 security/privacy/accessibility/performance audit
- `TESTING.md` — what's tested (and genuinely executed) vs. written-but-unverified
- `DEPLOYMENT.md` — how to actually deploy this, plus backups/disaster recovery
- `ADMIN_GUIDE.md` — running the platform day-to-day, no coding required
- `USER_GUIDE.md` — how to use it, by role (learner/instructor/organization/reviewer)
- `PRODUCTION_READINESS.md` — the honest final audit against the original brief
- `CHANGELOG.md` — what was built in each stage
- `DESIGN.md` — the visual design system
- `ENVIRONMENT.md` — environment variable reference
- `DEVELOPMENT.md` — local dev workflow and conventions
