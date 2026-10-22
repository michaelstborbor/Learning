# Deployment

**Stage F6 deliverable.** Concrete, Render-based deployment instructions —
chosen for consistency with your other project on this platform (IDTS) and
because it minimizes operational complexity for a non-technical founder, per
`PHASE0_BLUEPRINT.md` Section 6.2. Nothing here has been executed against a
real deployment (see the standing sandbox limitation in `ARCHITECTURE.md`) —
this is written to be followed step-by-step, and the first real run-through
should be treated as a genuine test, not a formality.

## Prerequisites

- A GitHub (or similar) repository containing this codebase
- A Render account (or your preferred alternative — the steps below are
  Render-specific, but the underlying requirements — managed Postgres, a
  Node web service, environment variables — apply to any comparable host)
- A domain name, if you want a custom domain rather than Render's default
  `*.onrender.com` subdomain

## 1. Local development

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000.

## 2. Environment variables

See `.env.example` for the full list with explanations. Required for the app
to function at all:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` — a long random string |
| `APP_BASE_URL` | Yes | The real public URL once deployed (used in emails, sitemap, certificate links) |
| `RESEND_API_KEY` | Recommended | Without it, emails are skipped with a logged warning, not sent — see `SECURITY.md`/`ARCHITECTURE.md` |
| `EMAIL_FROM_ADDRESS` | Recommended | Needs to be a verified sending domain in Resend |

**Never commit `.env`** — it's already in `.gitignore`. Set these directly in
Render's dashboard for the deployed environment, not in code.

## 3. Recommended: deploy with the Blueprint (one click, both pieces at once)

This repo includes `render.yaml` — a Blueprint that creates the database
*and* the web service together, wires them to each other automatically, and
generates `AUTH_SECRET` for you.

1. Push this code to a GitHub repository (or GitLab/Bitbucket).
2. In Render, go to **dashboard.render.com/blueprints** — not the main
   "New +" button, which is easy to miss the first time.
3. Connect the repository. Render reads `render.yaml` and shows you exactly
   what it's about to create: one web service, one Postgres database.
4. It will prompt you for three values it can't generate itself —
   `APP_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`. `APP_BASE_URL` can
   be a placeholder for now (Render's `*.onrender.com` URL) and updated once
   you know it, or the two Resend values can be left blank initially and
   added later — email sending degrades gracefully without them (see
   `ARCHITECTURE.md`'s Notifications section), nothing else breaks.
5. Click **Apply**. Render provisions both services and deploys.

Steps 4–8 below describe what the Blueprint just did for you, and are the
manual path if you'd rather set it up by hand or need to adjust something
the Blueprint doesn't cover (like choosing a specific region).

## 4. Database (Render Postgres) — manual path / what the Blueprint did

1. In the Render dashboard: **New → PostgreSQL**. Choose a plan (see cost
   estimate below) and region — pick the region closest to your primary
   users; for a Sierra Leone-first platform, Render's EU (Frankfurt) region
   is the lowest-latency option currently available. (The Blueprint doesn't
   let you pick a region interactively — if that matters to you, set the
   database up manually first, or edit `render.yaml`'s database block
   before connecting the Blueprint.)
2. Copy the **Internal Database URL** it gives you — this becomes
   `DATABASE_URL` for the web service (internal URLs are faster and free of
   egress cost when both services are on Render; use the external URL only
   if migrating from outside Render).
3. **Automated backups**: Render's paid Postgres plans include automated
   daily backups with a retention window depending on plan tier — confirm
   the current retention period in Render's dashboard for the plan you
   choose, since this has changed over time and this document could go
   stale on that specific detail. This satisfies Phase 29's "automated
   database backups" requirement without any custom backup code needed. See
   "Backups & Disaster Recovery" below for the recovery procedure and what
   this does and doesn't cover.

## 5. Web service (Render Web Service) — manual path / what the Blueprint did

1. **New → Web Service**, connect your repository.
2. **Build command:** `npm install --include=dev && npx prisma generate && npx prisma db push --skip-generate && npm run build`
   (`--include=dev` matters: with `NODE_ENV=production` set, a plain
   `npm install` skips Prisma, Tailwind and TypeScript and the build fails.
   A service created before this change keeps its old build command, so
   update it under the service's **Settings → Build & Deploy**.)
3. **Start command:** `npm run start`
4. **Environment:** Node
5. Add every environment variable from step 2 in the service's Environment
   tab.
6. **Sync the database schema on deploy.** The build command in
   `render.yaml` runs `npx prisma db push --skip-generate`, which creates or
   updates tables to match `prisma/schema.prisma`. (This repository has no
   `prisma/migrations` folder, so the earlier `prisma migrate deploy` step
   never created any tables.) `db push` stops with an error rather than
   drop data, so a destructive schema change can't slip through a deploy.
   If you later adopt migrations, baseline first with
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   and `npx prisma migrate resolve --applied <name>`.
7. **Course media storage.** Uploaded videos, audio and documents must live
   in an S3-compatible bucket in production, because Render's free web
   services lose their disk on every deploy. Cloudflare R2 has a free tier
   and no download (egress) fees, which suits video:
   1. In Cloudflare, create an R2 bucket (e.g. `eliteskills-media`).
   2. Create an R2 API token with *Object Read & Write* on that bucket only.
   3. Set `STORAGE_S3_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`),
      `STORAGE_S3_BUCKET`, `STORAGE_S3_ACCESS_KEY_ID` and
      `STORAGE_S3_SECRET_ACCESS_KEY` on the web service.
   4. Add a CORS rule on the bucket so browsers can upload directly:
      ```json
      [{ "AllowedOrigins": ["https://your-domain"], "AllowedMethods": ["PUT", "GET"],
         "AllowedHeaders": ["Content-Type", "Content-Encoding"], "MaxAgeSeconds": 3600 }]
      ```
   The bucket stays private: learners get short-lived signed links only
   after the app checks they're enrolled.
8. Deploy. Render builds and starts the service; watch the build logs for
   the first deploy specifically, since this is also the first time
   `npx prisma generate` will run with real network access — see
   `ARCHITECTURE.md`'s "Known sandbox limitation" for why that matters: this
   is the point where the Prisma-stub limitation that shaped several
   workarounds in this codebase (documented throughout `ARCHITECTURE.md`)
   stops applying.

**One thing that does NOT need a workaround here, unlike a previous
project's backend:** Render gives out a `postgres://`-scheme connection
string, and some database drivers choke on that unless it's rewritten to
`postgresql://`. Prisma accepts both schemes natively — nothing to fix on
that front for this app.

## Vercel (with Neon Postgres)

`vercel.json` sets the build command to
`prisma generate && prisma db push --skip-generate && next build`, so every
deploy regenerates the Prisma client (Vercel caches `node_modules`) and syncs
the database schema before building. If `db push` refuses a change that would
lose data, the build fails and the previous deployment stays live.

1. In Vercel, **Add New → Project** and import this repository. The framework
   is detected as Next.js; leave the build settings alone, `vercel.json`
   supplies them.
2. Under **Environment Variables**, add the values from section 2:
   `DATABASE_URL`, `AUTH_SECRET`, `APP_BASE_URL` (the Vercel URL or your
   domain), `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, and the `STORAGE_S3_*`
   variables.
3. For `DATABASE_URL`, use Neon's **direct** connection string (the host
   without `-pooler`) with `?sslmode=require`. `prisma db push` needs a direct
   connection; the pooled one can fail during the schema sync.
4. Course media must use S3-compatible storage on Vercel. Its filesystem is
   read-only, so the local driver cannot store uploads there.
5. A new Neon database starts empty. The first deploy creates the tables; run
   `npm run db:seed` against it from your machine if you want demo data, or
   restore a dump of the old database to keep existing users and courses.

## Railway

`railway.json` configures a Railway service from the repo:

- **Build:** `npx prisma generate && npm run build`.
- **Pre-deploy:** `npx prisma db push --skip-generate` creates or updates the
  database tables before each new version starts. This runs after the build,
  on Railway's private network, so a `*.railway.internal` `DATABASE_URL`
  works. If it fails (for example, a change that would lose data), Railway
  keeps the previous version running and shows the error in the deploy log.
- **Start:** `npm run start`. Next.js reads Railway's `PORT` on its own.

In the service's **Settings**, check that **Source** points at this repository
and the `main` branch, so merges deploy automatically. Add the variables from
section 2 under **Variables**, with `DATABASE_URL` referencing the Railway
Postgres service (`${{Postgres.DATABASE_URL}}`). Railway has no persistent disk
by default, so set the `STORAGE_S3_*` variables for course media as well.

## 6. Seed data (optional, recommended for a first demo)

Once the web service is live and migrations have run:

```bash
# From your local machine, pointed at the production DATABASE_URL,
# or via Render's shell on the deployed service:
npx prisma db seed
```

See `TESTING.md` for exactly what this creates. **Do this on a fresh/demo
database, not one with real user data** — it's demonstration content with
fictional names, meant for showing the platform off or for your own
first-pass testing, not for production use as-is.

## 7. Domain and SSL

1. In the web service's Settings → Custom Domain, add your domain.
2. Point your domain's DNS to Render per the instructions it gives you (a
   CNAME for a subdomain, or Render's provided A/ALIAS records for an apex
   domain).
3. Render provisions and renews SSL certificates automatically via Let's
   Encrypt — no manual certificate management needed.
4. Update `APP_BASE_URL` to the final custom domain once DNS has propagated,
   and redeploy — this affects email links, the sitemap, and certificate
   verification URLs.

## 8. Monitoring and logging

- Render's dashboard provides live and historical logs for the web service
  and database out of the box — no separate logging infrastructure needed
  at this stage.
- Render also provides basic metrics (CPU, memory, response times) per
  service.
- **Not yet set up:** error tracking/alerting (e.g. Sentry) and uptime
  monitoring (e.g. a pinger that alerts if the site goes down). Both are
  reasonable, low-cost additions worth doing before a serious public launch
  — flagged here as a gap, not silently assumed away.

## 9. Rollback

Render keeps a history of previous deploys. If a deploy causes a problem,
use **Manual Deploy → Deploy a specific commit** (or the "rollback" action
if shown for a previous successful deploy) to redeploy the last known-good
version. **This rolls back application code, not the database** — if the
problematic deploy included a schema migration, rolling back code alone
will not undo that migration; see Backups & Disaster Recovery below for
that scenario specifically.

## Backups & Disaster Recovery

Answering the specific questions Phase 29 asks for directly:

**What happens if the database is accidentally deleted?**
Restore from Render's automated daily backup (Dashboard → the Postgres
instance → Backups). This loses any writes since the last backup snapshot
(up to ~24 hours, depending on when the deletion happened relative to the
backup schedule) — there is currently no point-in-time recovery configured
beyond what Render's backup plan provides by default. If tighter recovery
granularity is ever needed, Render's higher Postgres tiers offer more
frequent backups/point-in-time recovery — worth revisiting if the platform
reaches a scale where losing up to a day of data would be seriously costly.

**What happens if the application server goes down?**
Render automatically restarts a crashed service. For a genuine platform
outage (Render itself down, or a bad deploy), use the rollback procedure
above. There is currently no multi-region failover or load-balanced
multi-instance setup — appropriate for the realistic first-deployment scale
of this platform (see the rate-limiter's documented single-instance
assumption in `SECURITY.md`), but worth naming as a real limitation if
uptime requirements ever get stricter.

**What happens if the payment service fails?**
Not applicable — payments are deferred (see `PHASE0_BLUEPRINT.md`'s Section
9 decisions). This question will need a real answer once a payment provider
is actually integrated.

**What happens if the email service (Resend) fails or is unconfigured?**
Nothing breaks — every code path that sends email is written to fail
gracefully and continue (see `ARCHITECTURE.md`'s Notifications section).
Registration, password reset, and cohort invites still complete their
database work even if the email itself doesn't send; the user just doesn't
get the email. Worth monitoring for (via the "not yet set up" alerting gap
above) so a real outage doesn't go unnoticed indefinitely.

## Estimated recurring infrastructure costs

**Directional only, not a quote** — Render's pricing can and does change,
and the right tier depends on real traffic once it exists. As of this
writing, roughly:

| Component | Tier | Approx. monthly cost |
|---|---|---|
| Render Web Service | Starter | ~$7–25 |
| Render PostgreSQL | Starter (with backups) | ~$7–20 |
| Resend (email) | Free tier | $0 (covers a generous volume for a launch-stage platform) |
| Object storage (when built) | Cloudflare R2 or similar | ~$0–5 at small scale |
| Domain registration | — | ~$10–15/year |

Realistic starting point: **roughly $15–45/month**, excluding domain
registration, before any meaningful traffic-driven scaling. Re-estimate once
real usage patterns exist, per the commitment made in
`PHASE0_BLUEPRINT.md` Section 6.4.

## Production launch checklist

Before pointing real users at this:

- [ ] All environment variables set in Render (not just `.env.example`
      copied blindly — `AUTH_SECRET` especially must be freshly generated,
      never reused from a development environment)
- [ ] `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` configured and the sending
      domain verified in Resend, so registration/password-reset emails
      actually deliver
- [ ] `APP_BASE_URL` set to the final production domain
- [ ] Custom domain DNS configured and SSL certificate issued (Render
      dashboard shows certificate status)
- [ ] Database migrations applied (`npx prisma migrate deploy` ran
      successfully — check the deploy logs)
- [ ] The full manual flow actually tried by a human: register, verify
      email, enrol in a course, complete a lesson, take a quiz, submit a
      project, get it graded (as a second test account with the Instructor
      role — see "granting roles" in `ADMIN_GUIDE.md`), see the certificate
      issue and verify it publicly
- [ ] At least one admin account confirmed working (`/admin`) — the first
      Super Admin needs to be set directly in the database once, since
      there's no self-service path to that role (by design — see
      `SECURITY.md`'s privilege-escalation notes)
- [ ] Backups confirmed actually present in the Render dashboard (don't
      just assume the plan includes them — check)
- [ ] Read `SECURITY.md`'s "Honest gaps" section and `TESTING.md`'s "What's
      still not tested at all" section — know what you're launching without,
      not just what you're launching with
