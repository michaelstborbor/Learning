import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information EliteSkills Academy collects, who can see it, and your choices.",
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        EliteSkills Academy is a free online learning platform for practical, job-ready skills, run
        by Elite Network Limited from Sierra Leone. In this policy, &ldquo;we&rdquo; means EliteSkills Academy and
        &ldquo;you&rdquo; means anyone who visits the site or has an account: learners, instructors,
        reviewers, organizations and administrators.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>We only collect what the platform needs to teach, assess and certify.</p>
        <Bullets
          items={[
            <>
              <strong>Your account:</strong> your full name, email address and a password. The
              password is stored only as a one-way bcrypt hash, so nobody (including us) can read it.
            </>,
            <>
              <strong>Your learning record:</strong> the courses you enrol in, lessons you complete,
              your quiz answers and scores, project links and notes you submit, the grades and
              feedback you receive, the skills on your Skills Passport and any certificates you earn.
            </>,
            <>
              <strong>Study buddy chats:</strong> the questions you ask the AI study buddy and its
              replies, plus the explanation level and language you choose.
            </>,
            <>
              <strong>Cohorts and opportunities:</strong> if an organization adds you to a training
              cohort, your membership and attendance; if you apply for an opportunity, your
              application and cover note.
            </>,
            <>
              <strong>Course materials:</strong> if you teach, the courses, lessons, quizzes, videos,
              audio, documents, transcripts and poster images you upload.
            </>,
            <>
              <strong>Technical information:</strong> your IP address is used briefly to limit
              repeated attempts (for example, too many wrong passwords). It is held in a counter that
              expires within an hour and is then cleared out. Our hosting provider keeps short-lived
              security logs, and a bot check looks at signals from your browser to confirm a real
              person is signing in.
            </>,
          ]}
        />
        <p>
          We don&apos;t ask for your national ID, date of birth, address, phone number, health,
          religion, ethnicity or payment details. Please don&apos;t put sensitive personal
          information in project notes, cover notes or study buddy chats.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use it",
    body: (
      <>
        <p>
          We use your information to run your account, show your progress, grade your work, issue and
          verify certificates, connect you with opportunities you apply for, answer your study buddy
          questions, send account emails (email verification and password resets), keep the platform
          secure and improve courses. The{" "}
          <Link href="/data-use" className="font-medium text-brand-600 hover:underline">
            data use policy
          </Link>{" "}
          explains each purpose in detail.
        </p>
        <p>
          We never sell your data, never use it for advertising and never use it to train AI models.
        </p>
      </>
    ),
  },
  {
    id: "who-can-see-it",
    title: "Who can see your information",
    body: (
      <Bullets
        items={[
          <>
            <strong>Instructors</strong> see the progress, quiz results and project submissions of
            learners in their own courses, so they can grade and support them.
          </>,
          <>
            <strong>Organizations</strong> see the progress and attendance of people in cohorts they
            run, and the applications sent to their opportunities, including your name and cover
            note.
          </>,
          <>
            <strong>Reviewers and administrators</strong> can see what they need to check course
            quality, manage accounts and keep the platform safe. Their sensitive actions are recorded
            in an audit log.
          </>,
          <>
            <strong>Anyone with your certificate number</strong> can confirm it on the public verify
            page, which shows your name, the course, the date and whether it is still valid. Nothing
            else about you is shown.
          </>,
          <>
            <strong>Service providers</strong> who run parts of the platform for us (listed below)
            process data only to provide their service.
          </>,
        ]}
      />
    ),
  },
  {
    id: "service-providers",
    title: "Service providers",
    body: (
      <>
        <Bullets
          items={[
            <>
              <strong>Vercel</strong> hosts the website, stores uploaded files, provides
              privacy-friendly page analytics and the bot check.
            </>,
            <>
              <strong>Neon</strong> hosts the database that holds accounts and learning records.
            </>,
            <>
              <strong>Anthropic</strong> provides the AI model behind the study buddy. Your question,
              recent messages in that chat and the relevant course material are sent to it to write
              each reply. Anthropic does not use this data to train its models.
            </>,
            <>
              <strong>Resend</strong> delivers account emails.
            </>,
          ]}
        />
        <p>
          These providers may store data on servers outside Sierra Leone, mainly in the United
          States and Europe. We choose providers with strong security practices and use their
          business services, which limit how they may use your data.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        We use one essential cookie, <code>ecoskills_session</code>, to keep you logged in. It lasts
        up to 7 days and can&apos;t be read by scripts on the page. We don&apos;t use advertising or
        tracking cookies, and our page analytics work without cookies.
      </p>
    ),
  },
  {
    id: "how-long",
    title: "How long we keep it",
    body: (
      <Bullets
        items={[
          "Your account and learning record are kept while your account is open.",
          "Study buddy chats are kept until you clear them with “Clear chat”, or until the course is removed.",
          "Certificates and their audit history are kept so employers can keep verifying them, even if a course is later archived.",
          "Rate-limit counters expire within an hour and are then cleared out. Hosting security logs are kept for a short period by Vercel.",
          "If you ask us to delete your account, we remove your personal information within 30 days, except where we must keep a record (for example, an issued certificate, which we can anonymise or revoke at your request).",
        ]}
      />
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: (
      <>
        <Bullets
          items={[
            <>
              <strong>Get a copy:</strong> use &ldquo;Download my data&rdquo; on your{" "}
              <Link href="/account" className="font-medium text-brand-600 hover:underline">
                account page
              </Link>{" "}
              to download everything we hold about you.
            </>,
            <>
              <strong>Correct it:</strong> ask us to fix anything that is wrong.
            </>,
            <>
              <strong>Delete it:</strong> clear a study buddy chat at any time, or ask us to delete
              your account.
            </>,
            <>
              <strong>Stay in control of sign-ins:</strong> &ldquo;Log out on all devices&rdquo; on
              your account page ends every session at once.
            </>,
          ]}
        />
        <p>
          For anything else, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-600 hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We reply within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <Bullets
        items={[
          "All traffic is encrypted with HTTPS, and browsers are told to always use it.",
          "Passwords are hashed with bcrypt; reset and verification links are single-use, expire, and are stored only as hashes.",
          "Every page and action checks your role on the server, and changing a role, deactivating an account or resetting a password takes effect immediately.",
          "Repeated login, sign-up and reset attempts are limited, and an invisible bot check blocks automated sign-ups and password guessing.",
          "Course videos, audio and documents are stored privately and only served to people allowed to see the course.",
          "Administrative actions such as role changes, publishing, deleting courses and revoking certificates are recorded in an audit log.",
        ]}
      />
    ),
  },
  {
    id: "children",
    title: "Young learners",
    body: (
      <p>
        EliteSkills Academy is meant for people aged 16 and over. If you are under 18, please use it
        with the knowledge of a parent, guardian or teacher. If you believe a child under 16 has an
        account, contact us and we will remove it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change how we handle personal information, we will update this page and its date, and
        tell account holders about important changes by email or on the site before they take
        effect.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      current="/privacy"
      intro={
        <p>
          This policy explains what personal information EliteSkills Academy collects, why, who can
          see it and the choices you have. We wrote it to match exactly what the platform does.
        </p>
      }
      sections={sections}
    />
  );
}
