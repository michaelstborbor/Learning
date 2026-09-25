# Design System

## Direction

EcoSkills Academy should feel grounded in Sierra Leone's real landscape and in
practical, hands-on work — not a generic "African-themed" template, and not a
generic SaaS-card kit. It should also read as a serious platform, not a
university (the product brief is explicit that this is not a degree
equivalent).

## Colour

Four functional roles, not decorative choices:

| Role | Token prefix | Hex (core) | Used for |
|---|---|---|---|
| Brand | `brand-*` | `#0F4C46` (deep teal-green) | Navigation, headings, links, primary identity |
| Action | `action-*` | `#9C6209` (ochre) | Calls to action — enrol, submit, save |
| Verified | `verified-*` | `#2F8F5B` | **Only** demonstrated competency: certificates, verified Skills Passport entries, passed practical projects |
| Danger | `danger-*` | `#B4462F` | Errors and destructive actions only |

**The verified/danger colours are never reused for anything else.** This is a
deliberate product-integrity choice, not a stylistic one: a learner should be
able to tell "I finished this video" from "I proved I can do this" at a
glance, everywhere in the product, without reading text.

## Type

- **Display/headline face:** Space Grotesk, self-hosted via the
  `@fontsource/space-grotesk` npm package (weights 500/600/700 only). Chosen
  for its engineered, practical character — fits "technology + employability"
  better than a serif (which reads academic/institutional) or a generic
  neutral grotesk. Self-hosted rather than loaded from Google's CDN so there
  is zero external network dependency and zero extra round-trip on a slow
  connection.
- **Body face:** system font stack (no additional bytes at all). Used for all
  body copy, forms, and UI chrome. The display face is reserved for
  headlines, the logo, and numbered step markers — spend the "distinctive"
  budget in one place, keep everything else quiet.

## Layout device: the pipeline

Learn → Practice → Demonstrate → Certify → Connect is a genuine five-step
sequence, so it gets one real numbered/step visual treatment
(`src/components/ui/Pipeline.tsx`). This is the single memorable structural
device in the product. It belongs on the homepage hero and on course-progress
views. It should not be used decoratively elsewhere.

## Components

All in `src/components/ui/`. See `/style-guide` in the running app for a live,
current reference — it renders the real components, not a mockup.

| Component | Notes |
|---|---|
| `Button` | `primary` (ochre) reserved for the one most important action per screen |
| `Badge` | `verified` tone reserved for demonstrated competency only |
| `Card` | Thin border, one radius, no drop-shadow |
| `Alert` | `info` / `success` / `danger` |
| `ProgressBar` | Always brand colour — progress through content, not a competency signal |
| `EmptyState` | Always includes an action, never a dead end |
| `CourseCard` | Catalogue browsing |
| `Pipeline` | The five-stage brand device |
| `Nav` | Public-site navigation shell |

## Not yet built

Forms, tables, modals, pagination, dashboards, and certificate-display
components are intentionally deferred — they'll be built alongside the
feature that first needs them (e.g., the certificate component arrives with
the certification module), rather than speculatively now.

## Accessibility baseline

- Visible focus rings on all interactive elements (`focus-visible:outline`)
- `prefers-reduced-motion` respected globally (see `globals.css`)
- Colour is never the only signal — badges/alerts carry text, not just colour
- Target WCAG 2.2 AA; full accessibility audit happens in its own later stage
