import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Pipeline } from "@/components/ui/Pipeline";

export const metadata: Metadata = {
  title: "About",
  description:
    "EliteSkills Academy is a free, open-source platform for building practical, workplace-ready skills in Sierra Leone and West Africa.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          About EliteSkills Academy
        </h1>

        <p className="mt-6 text-ink-700">
          EliteSkills Academy is a free, open-source platform for building
          practical, workplace-ready skills — starting in Sierra Leone, with
          an architecture designed to grow across West Africa.
        </p>

        <p className="mt-4 text-ink-700">
          We built it around a simple idea: finishing a lesson and proving
          you can actually do the work are two different things. A lot of
          learning platforms only measure the first. EliteSkills Academy is
          built to measure the second.
        </p>

        <div className="mt-8">
          <Pipeline />
        </div>

        <p className="mt-8 text-ink-700">
          Every course pairs practical instruction with a real project you
          submit and get graded on. Passing that project — not just watching
          the videos — is what earns you a verified skill on your Skills
          Passport and, where applicable, a certificate.
        </p>

        <p className="mt-4 text-ink-700">
          EliteSkills Academy does not offer degrees and is not a university.
          It is a practical-skills platform, and we describe it as exactly
          that.
        </p>
      </main>
    </>
  );
}
