import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Data use policy",
  description: "Exactly how EliteSkills Academy uses learning data, analytics and the AI study buddy.",
};

const sections: LegalSection[] = [
  {
    id: "principles",
    title: "Our principles",
    body: (
      <Bullets
        items={[
          "Use data only to help people learn, prove their skills and find opportunities.",
          "Collect the least we need, and show it only to people with a reason to see it.",
          "Never sell data, never show adverts, never use learners' data to train AI models.",
          "Prefer totals over individuals when measuring how the platform is doing.",
          "Tell people plainly what happens to their data, and let them download it.",
        ]}
      />
    ),
  },
  {
    id: "purposes",
    title: "What each kind of data is used for",
    body: (
      <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-ink-50 text-xs text-ink-500">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Data</th>
              <th scope="col" className="px-4 py-2 font-medium">Used for</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {[
              ["Name and email", "Logging in, account emails, your certificates and the people who teach or employ you knowing who you are."],
              ["Lesson progress", "Showing your progress and streak, resuming where you left off, course completion, and course-level totals for instructors."],
              ["Quiz answers and scores", "Grading, your gradebook, certificate rules, and helping instructors find confusing questions."],
              ["Project submissions and grades", "Assessing your practical work, feedback, your Skills Passport and certificates."],
              ["Certificates", "Proving your skills to anyone you share the certificate number with."],
              ["Cohort membership and attendance", "Letting the organization that trains you track its programme."],
              ["Applications", "Sending your application to the organization you applied to."],
              ["Study buddy chats", "Answering your questions with the course material, and keeping the conversation going."],
              ["IP address", "Briefly limiting repeated attempts to protect accounts from password guessing."],
            ].map(([data, use]) => (
              <tr key={data} className="border-t border-ink-100">
                <th scope="row" className="px-4 py-2.5 font-medium text-ink-900">{data}</th>
                <td className="px-4 py-2.5">{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    body: (
      <>
        <p>We measure how the platform is used in two ways, both designed so no one is singled out.</p>
        <Bullets
          items={[
            <>
              <strong>Page analytics (Vercel Web Analytics):</strong> counts page views, which pages
              people visit, the country, device type, browser and the site that referred them. It
              sets no cookies and doesn&apos;t build a profile of you. Before anything is sent, we
              remove the part of the address after &ldquo;?&rdquo; (which can hold one-time links)
              and certificate numbers.
            </>,
            <>
              <strong>Learning insights for administrators:</strong> totals such as active learners
              this week, lessons completed, sign-ups, study buddy questions, certificates issued and
              how many learners start and finish each course. These are counts only; they don&apos;t
              list or rank individual learners.
            </>,
          ]}
        />
        <p>
          We use these numbers to decide which courses to improve, where learners get stuck and what
          to build next.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "The AI study buddy",
    body: (
      <>
        <p>
          Each course has an AI study buddy that explains the course in simpler or more advanced
          terms, in English or Krio. Here is exactly what it does with data:
        </p>
        <Bullets
          items={[
            "When you send a message, your question, your recent messages in that course's chat, the course outline, lesson text and any video or audio transcripts are sent to Anthropic, the company that provides the AI model, to write the reply.",
            "Your name, email and grades are not sent.",
            "Your chat is saved so you can come back to it. Clear chat deletes it.",
            "Anthropic processes the data under its commercial terms and does not use it to train its models.",
            "Instructors and administrators do not read individual chats; administrators only see how many questions were asked.",
            "Each learner can send up to 40 messages an hour, to keep the service fair and affordable.",
          ]}
        />
        <p>
          The study buddy can make mistakes. Check important facts against your lessons or ask your
          instructor. Don&apos;t share passwords or sensitive personal information in the chat.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "When data is shared",
    body: (
      <>
        <p>Your data only leaves the platform:</p>
        <Bullets
          items={[
            "with the service providers that run the platform (Vercel, Neon, Anthropic and Resend), only to provide their service;",
            "with an organization, when you apply for its opportunity or it enrols you in a cohort;",
            "with anyone you give a certificate number to, who can confirm it on the verify page;",
            "if the law requires it, and then only what is required.",
          ]}
        />
        <p>Employers never get your learning record unless you apply to them or share a certificate.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security and bot protection",
    body: (
      <p>
        To keep accounts safe we limit repeated attempts by IP address and by account, and use Vercel
        BotID, an invisible check that looks at signals from your browser to tell real people from
        automated scripts on sign-up, login, password reset and the study buddy. These signals are
        used only for that check. See the{" "}
        <Link href="/privacy#security" className="font-medium text-brand-600 hover:underline">
          privacy policy
        </Link>{" "}
        for the other protections.
      </p>
    ),
  },
  {
    id: "your-data",
    title: "Your data, your copy",
    body: (
      <p>
        You can download everything we hold about you from your{" "}
        <Link href="/account" className="font-medium text-brand-600 hover:underline">
          account page
        </Link>
        , and ask us to correct or delete it. See{" "}
        <Link href="/privacy#your-rights" className="font-medium text-brand-600 hover:underline">
          your choices and rights
        </Link>
        .
      </p>
    ),
  },
];

export default function DataUsePage() {
  return (
    <LegalPage
      title="Data use policy"
      current="/data-use"
      intro={
        <p>
          This policy goes into detail on how EliteSkills Academy uses the data described in our{" "}
          <Link href="/privacy" className="font-medium text-brand-600 hover:underline">
            privacy policy
          </Link>
          : for learning, for measuring what works, and for the AI study buddy.
        </p>
      }
      sections={sections}
    />
  );
}
