import { Nav } from "@/components/ui/Nav";
import { Pipeline } from "@/components/ui/Pipeline";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-10 px-4 py-16">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Learn practical skills. Prove what you can do.
          </h1>
          <p className="max-w-xl text-lg text-ink-500">
            EcoSkills Academy is a free, open, mobile-first platform for
            building real workplace skills — starting in Sierra Leone.
          </p>
          <div>
            <Button variant="primary">Browse courses</Button>
          </div>
        </div>
        <Pipeline />
        <p className="text-sm text-ink-500">
          Phase 2 — design system in place. Course catalogue, learning, and
          accounts are not built yet.
        </p>
      </main>
    </>
  );
}
