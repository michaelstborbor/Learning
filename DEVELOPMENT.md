# Development Workflow

## Per-stage discipline

Every build stage follows the same sequence (matches the workflow specified in the
original project brief):

1. Inspect existing project state
2. Explain what will be implemented, in plain language, before writing code
3. Implement only the current stage's scope
4. Lint (`npm run lint`)
5. Build (`npm run build`)
6. Fix any errors
7. Run unit tests (`npm test`) where the stage touches tested logic
8. Review security implications
9. Review mobile responsiveness
10. Update documentation (this file, `ARCHITECTURE.md`, `DATABASE.md`)
11. Provide a completion report, including anything left incomplete

No stage is marked complete without actually running lint/build/test and
reporting the real result — not an assumed one.

## Commands

```bash
npm run dev        # local development server
npm run lint       # ESLint
npm run build      # production build
npm run format     # Prettier (write mode) — add this script if not already present
npm test           # unit tests (Vitest) — runs standalone, no database needed
npm run test:watch # unit tests in watch mode
npm run test:e2e   # Playwright E2E — needs a running instance + a real database + `npx playwright install` first
npm run db:seed    # populate demo data — see TESTING.md and prisma/seed.ts
```

## Code organization (as modules are added)

```
src/
  app/            # Next.js App Router pages/routes
  modules/        # business-logic modules (auth, courses, assessments, ...)
  components/     # shared UI components
  lib/            # shared utilities
prisma/
  schema.prisma   # database schema (grows incrementally, see DATABASE.md)
```

## Conventions

- TypeScript strict mode
- No client-side authorization trust — every sensitive check is server-side
- No secrets in committed code, ever — use environment variables
- Prettier + Tailwind class sorting enforced via `prettier-plugin-tailwindcss`
