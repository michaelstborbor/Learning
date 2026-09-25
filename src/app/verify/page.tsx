import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { VerifyForm } from "@/components/certificates/VerifyForm";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check whether an EcoSkills Academy certificate is genuine — no account required.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-ink-900">
          Verify a certificate
        </h1>
        <p className="mt-2 text-ink-500">
          Anyone can check whether an EcoSkills Academy certificate is
          genuine — no account required.
        </p>

        <div className="mt-8">
          <VerifyForm initialCertificateNumber={id} />
        </div>
      </main>
    </>
  );
}
