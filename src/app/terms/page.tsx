import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, CONTACT_EMAIL, LegalPage, type LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The rules for using EliteSkills Academy as a learner, instructor or organization.",
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About EliteSkills Academy",
    body: (
      <p>
        EliteSkills Academy is a free, open-access platform for practical skills learning. It is not
        a university, does not award degrees and does not guarantee a job or any other outcome. By
        creating an account or using the site you agree to these terms, our{" "}
        <Link href="/privacy" className="font-medium text-brand-600 hover:underline">
          privacy policy
        </Link>{" "}
        and our{" "}
        <Link href="/data-use" className="font-medium text-brand-600 hover:underline">
          data use policy
        </Link>
        .
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <Bullets
        items={[
          "You must be 16 or older. If you are under 18, use the platform with the knowledge of a parent, guardian or teacher.",
          "Use your real name: it appears on your certificates.",
          "Keep your password private and don't share your account. You are responsible for what happens under it.",
          "Tell us straight away if you think someone else has used your account. You can also use “Log out on all devices” on your account page.",
          "Everyone starts as a learner. Instructor, reviewer, organization and administrator roles are given by our administrators.",
        ]}
      />
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>When using the platform you must not:</p>
        <Bullets
          items={[
            "access, or try to access, accounts, courses or data that aren't yours;",
            "submit someone else's work as your own, share quiz answers, or otherwise cheat on assessments;",
            "use bots, scrapers or scripts to create accounts, log in, copy content or send messages;",
            "probe, scan or test the platform's security, or overload it, without our written permission;",
            "upload anything unlawful, harmful, hateful, sexually explicit, or that infringes someone else's rights, or any malware;",
            "use the AI study buddy to produce harmful content or anything unrelated to learning;",
            "harass or mislead other users, or pretend to be someone else.",
          ]}
        />
        <p>
          Found a security problem? Please report it privately to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand-600 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          instead of testing it further.
        </p>
      </>
    ),
  },
  {
    id: "learners",
    title: "Learning, assessment and certificates",
    body: (
      <Bullets
        items={[
          "Certificates are issued automatically when you meet a course's requirements: every lesson completed, every quiz passed and, where there is one, a passing project.",
          "A certificate shows skills demonstrated on this platform. It is not a government or institutional accreditation unless the course says so.",
          "We may revoke a certificate obtained by cheating, by mistake, or in breach of these terms. Revocations are recorded, and the verify page will show the certificate as revoked.",
          "You keep ownership of the projects you submit. You allow instructors and reviewers to view and assess them.",
        ]}
      />
    ),
  },
  {
    id: "instructors",
    title: "Instructors and course content",
    body: (
      <Bullets
        items={[
          "You must own, or have permission to use, everything you upload: text, videos, audio, documents, images and transcripts.",
          "You keep ownership of your courses. You give EliteSkills Academy a free, non-exclusive licence to host, show, adapt for different devices and share them with learners on the platform, including using lessons and transcripts to power the AI study buddy.",
          "Courses go through review before they are published. Administrators may edit, archive or remove content that breaks these terms or is inaccurate.",
          "A course that has issued certificates can't be deleted, so those certificates stay verifiable. It can be archived instead.",
        ]}
      />
    ),
  },
  {
    id: "organizations",
    title: "Organizations and opportunities",
    body: (
      <Bullets
        items={[
          "Organizations must post only genuine opportunities, describe them honestly and never charge applicants a fee.",
          "Organizations may use applicant and cohort information only to run that opportunity or training, and must keep it secure.",
          "EliteSkills Academy is not the employer and isn't responsible for an organization's hiring decisions.",
        ]}
      />
    ),
  },
  {
    id: "ai",
    title: "The AI study buddy",
    body: (
      <p>
        The study buddy is an AI tutor that explains course material. Its answers can be wrong or
        incomplete, so check important points against your lessons and your instructor. It is not a
        source of professional, legal, medical or financial advice. Messages are limited per hour to
        keep the service fair.
      </p>
    ),
  },
  {
    id: "service",
    title: "Availability and changes to the service",
    body: (
      <p>
        We work to keep the platform running and secure, but it is provided free and &ldquo;as
        is&rdquo;, and may sometimes be unavailable. We may add, change or remove features and
        courses. We will give notice before removing features that affect your learning record.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "Suspending or closing accounts",
    body: (
      <p>
        We may suspend or close an account that breaks these terms or puts other users or the
        platform at risk. Where it is safe to do so, we will tell you why. You can stop using the
        platform at any time and ask us to delete your account.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        To the extent the law allows, EliteSkills Academy is not liable for indirect losses, lost
        opportunities or decisions others make based on your learning record. Nothing in these terms
        limits rights you have under the law of Sierra Leone that cannot be limited.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: <p>These terms are governed by the laws of Sierra Leone.</p>,
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms as the platform grows. We will change the date at the top of this
        page and tell account holders about important changes before they take effect. Continuing to
        use the platform after that means you accept the new terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and conditions"
      current="/terms"
      intro={
        <p>
          These terms set out the rules for using EliteSkills Academy, whether you are learning,
          teaching or offering opportunities. They are written in plain language; please read them.
        </p>
      }
      sections={sections}
    />
  );
}
