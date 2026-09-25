import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourseCard } from "@/components/ui/CourseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pipeline } from "@/components/ui/Pipeline";
import { ProgressBar } from "@/components/ui/ProgressBar";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-ink-100 py-10 first:border-t-0 first:pt-0">
      <h2 className="font-display text-xl font-semibold text-ink-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-ink-900">
        Design system
      </h1>
      <p className="mt-2 text-ink-500">
        Phase 2 reference. Every component here is real code from{" "}
        <code className="text-sm">src/components/ui/</code>, not a mockup.
      </p>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Brand", "bg-brand-600"],
            ["Action", "bg-action-500"],
            ["Verified", "bg-verified-500"],
            ["Danger", "bg-danger-500"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-md ${cls}`} />
              <span className="text-sm text-ink-700">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="The core pipeline">
        <Pipeline activeIndex={2} />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Enrol now</Button>
          <Button variant="secondary">View syllabus</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Revoke certificate</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge tone="neutral">Draft</Badge>
          <Badge tone="brand">Data & Analytics</Badge>
          <Badge tone="verified">Competency verified</Badge>
          <Badge tone="danger">Overdue</Badge>
        </div>
      </Section>

      <Section title="Alerts">
        <div className="flex flex-col gap-3">
          <Alert tone="info" title="Your course was submitted for review">
            A content reviewer will check it before it goes live.
          </Alert>
          <Alert tone="success" title="Certificate issued">
            This certificate is now publicly verifiable.
          </Alert>
          <Alert tone="danger" title="Payment could not be verified">
            Try again, or contact support if the charge appears on your
            statement.
          </Alert>
        </div>
      </Section>

      <Section title="Progress">
        <ProgressBar value={64} label="Excel for M&E — course progress" />
      </Section>

      <Section title="Course card">
        <div className="grid gap-4 sm:grid-cols-2">
          <CourseCard
            title="Excel for Monitoring & Evaluation"
            category="Data & Analytics"
            level="Beginner"
            durationLabel="6 hours"
            certificateEligible
          />
          <CourseCard
            title="Professional Report Writing"
            category="Communication"
            level="Intermediate"
            durationLabel="4 hours"
          />
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState
          title="You haven't enrolled in any courses yet"
          description="Browse the catalogue to find a practical skill to start with."
          action={<Button variant="primary">Browse courses</Button>}
        />
      </Section>

      <Section title="Card">
        <Card>
          <p className="text-sm text-ink-700">
            The base surface used for dashboards, forms, and grouped content.
            Thin border, one radius, no drop-shadow.
          </p>
        </Card>
      </Section>
    </main>
  );
}
