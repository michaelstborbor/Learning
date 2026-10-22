import type { Metadata } from "next";
import { Nav } from "@/components/ui/Nav";
import { Icon } from "@/components/ui/Icon";
import { CopyNumberButton } from "@/components/support/CopyNumberButton";
import {
  MOBILE_MONEY,
  WHATSAPP_NUMBER,
  formatLocalNumber,
  whatsappLink,
} from "@/lib/donations";

export const metadata: Metadata = {
  title: "Support free learning",
  description:
    "Donate to EliteSkills Academy with Orange Money or Afrimoney in Sierra Leone, or contact us on WhatsApp from abroad.",
};

const WHATSAPP_MESSAGE = "Hello EliteSkills Academy, I would like to support the platform with a donation.";

export default function SupportPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Support free learning</h1>
        <p className="mt-4 max-w-[62ch] text-ink-700">
          EliteSkills Academy is free for every learner. Donations pay for hosting, course videos and
          the AI study buddy, so more young people can learn job-ready skills. Every amount helps.
        </p>

        <section aria-labelledby="in-sl" className="mt-10">
          <h2 id="in-sl" className="font-display text-xl font-semibold text-ink-900">
            In Sierra Leone: send mobile money
          </h2>
          <p className="mt-2 text-sm text-ink-500">
            Copy a number, then paste it into your Orange Money or Afrimoney app or menu when you send money.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {MOBILE_MONEY.map((wallet) => (
              <li key={wallet.id} className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-raised">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon name="phone" size={20} />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{wallet.name}</h3>
                </div>
                <p className="font-display text-2xl font-bold tabular-nums tracking-wide text-ink-900">
                  <a href={`tel:${wallet.number}`} className="hover:text-brand-600">
                    {formatLocalNumber(wallet.number)}
                  </a>
                </p>
                <CopyNumberButton number={wallet.number} label={wallet.name} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-500">
            Before you confirm a transfer, check that the number on your screen matches the one above.
          </p>
        </section>

        <section aria-labelledby="outside-sl" className="mt-12">
          <h2 id="outside-sl" className="font-display text-xl font-semibold text-ink-900">
            Outside Sierra Leone: message us on WhatsApp
          </h2>
          <p className="mt-2 max-w-[62ch] text-sm text-ink-500">
            Mobile money only works inside Sierra Leone. Message us and we&apos;ll share the best way to
            send your donation from where you are.
          </p>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-raised sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-ink-500">WhatsApp</p>
              <p className="font-display text-2xl font-bold tabular-nums tracking-wide text-ink-900">
                +232 {formatLocalNumber(WHATSAPP_NUMBER).replace(/^0/, "")}
              </p>
            </div>
            <a
              href={whatsappLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Icon name="chat" size={18} /> Message us on WhatsApp
              <span className="sr-only"> (opens WhatsApp)</span>
            </a>
          </div>
        </section>

        <p className="mt-12 text-sm text-ink-500">
          Thank you. Questions about donations? Email{" "}
          <a href="mailto:hello@ecoskillsacademy.org" className="font-medium text-brand-600 hover:underline">
            hello@ecoskillsacademy.org
          </a>
          .
        </p>
      </main>
    </>
  );
}
