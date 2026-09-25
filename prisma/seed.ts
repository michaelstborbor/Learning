// Realistic demonstration data (Section 25 / Stage F5 of the project brief).
// Fictional users, fictional organization — no real institutions or
// endorsements, per the brief's explicit instruction.
//
// HONEST LIMITATION: this script has not been run against a real database
// in the sandbox this was built in (see ARCHITECTURE.md's "Known sandbox
// limitation" — no network path to Prisma's engine binary). It is written
// carefully and reviewed, but "does this actually seed cleanly" should be
// the first thing verified the moment this runs somewhere with a real
// Postgres connection, before relying on it for a demo.
//
// Run with: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Seeding EcoSkills Academy demo data...");

  // --- Users -------------------------------------------------------
  const passwordHash = await hash("DemoPass123!");

  const superAdmin = await prisma.user.upsert({
    where: { email: "super.admin@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "super.admin@ecoskillsacademy.test",
      fullName: "Aminata Kamara",
      passwordHash,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  const platformAdmin = await prisma.user.upsert({
    where: { email: "admin@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "admin@ecoskillsacademy.test",
      fullName: "Mohamed Sesay",
      passwordHash,
      role: "PLATFORM_ADMIN",
      emailVerified: new Date(),
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "reviewer@ecoskillsacademy.test",
      fullName: "Fatmata Bangura",
      passwordHash,
      role: "CONTENT_REVIEWER",
      emailVerified: new Date(),
    },
  });

  const instructorOne = await prisma.user.upsert({
    where: { email: "instructor1@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "instructor1@ecoskillsacademy.test",
      fullName: "Ibrahim Conteh",
      passwordHash,
      role: "INSTRUCTOR",
      emailVerified: new Date(),
    },
  });

  const instructorTwo = await prisma.user.upsert({
    where: { email: "instructor2@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "instructor2@ecoskillsacademy.test",
      fullName: "Isata Koroma",
      passwordHash,
      role: "INSTRUCTOR",
      emailVerified: new Date(),
    },
  });

  const orgOwner = await prisma.user.upsert({
    where: { email: "org@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "org@ecoskillsacademy.test",
      fullName: "Samuel Turay",
      passwordHash,
      role: "ORGANIZATION",
      emailVerified: new Date(),
    },
  });

  const learnerOne = await prisma.user.upsert({
    where: { email: "learner1@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "learner1@ecoskillsacademy.test",
      fullName: "Adama Sesay",
      passwordHash,
      role: "LEARNER",
      emailVerified: new Date(),
    },
  });

  const learnerTwo = await prisma.user.upsert({
    where: { email: "learner2@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "learner2@ecoskillsacademy.test",
      fullName: "Foday Mansaray",
      passwordHash,
      role: "LEARNER",
      emailVerified: new Date(),
    },
  });

  const learnerThree = await prisma.user.upsert({
    where: { email: "learner3@ecoskillsacademy.test" },
    update: {},
    create: {
      email: "learner3@ecoskillsacademy.test",
      fullName: "Mariama Jalloh",
      passwordHash,
      role: "LEARNER",
      emailVerified: new Date(),
    },
  });

  console.log("Users created. Every account's password: DemoPass123!");

  // --- Skills --------------------------------------------------------
  const skillNames: Array<{ name: string; category: string }> = [
    { name: "Microsoft Excel", category: "Digital Skills" },
    { name: "Monitoring & Evaluation", category: "M&E" },
    { name: "Data Collection (KoboToolbox)", category: "Data Skills" },
    { name: "Report Writing", category: "Communication" },
    { name: "Project Management", category: "Professional Skills" },
  ];
  const skills: Record<string, { id: string }> = {};
  for (const s of skillNames) {
    skills[s.name] = await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }

  // --- Helper to build a full course (modules/lessons/quiz/project) --
  async function buildFullCourse(opts: {
    title: string;
    slug: string;
    description: string;
    category: string;
    level: string;
    estimatedHours: number;
    status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
    instructorId: string;
    moduleTitles: string[];
    quizQuestions?: { prompt: string; correctIndex: number; options: string[] }[];
    project?: { title: string; instructions: string; rubric: string; skillName?: string };
  }) {
    const course = await prisma.course.upsert({
      where: { slug: opts.slug },
      update: {},
      create: {
        title: opts.title,
        slug: opts.slug,
        description: opts.description,
        category: opts.category,
        level: opts.level,
        estimatedHours: opts.estimatedHours,
        status: opts.status,
        instructorId: opts.instructorId,
      },
    });

    for (let mi = 0; mi < opts.moduleTitles.length; mi++) {
      const existingModule = await prisma.module.findFirst({
        where: { courseId: course.id, title: opts.moduleTitles[mi] },
      });
      const moduleRow =
        existingModule ??
        (await prisma.module.create({
          data: { courseId: course.id, title: opts.moduleTitles[mi], order: mi },
        }));

      const lessonCount = await prisma.lesson.count({ where: { moduleId: moduleRow.id } });
      if (lessonCount === 0) {
        await prisma.lesson.createMany({
          data: [
            {
              moduleId: moduleRow.id,
              title: `${opts.moduleTitles[mi]} — Overview`,
              content: `An introduction to ${opts.moduleTitles[mi].toLowerCase()}, covering the core concepts you'll need before the practical work in this module.`,
              order: 0,
            },
            {
              moduleId: moduleRow.id,
              title: `${opts.moduleTitles[mi]} — Hands-on practice`,
              content: `A guided, hands-on walkthrough applying what you just learned in ${opts.moduleTitles[mi].toLowerCase()} to a realistic workplace example.`,
              order: 1,
            },
          ],
        });
      }
    }

    if (opts.quizQuestions) {
      const existingQuiz = await prisma.quiz.findUnique({ where: { courseId: course.id } });
      if (!existingQuiz) {
        await prisma.quiz.create({
          data: {
            courseId: course.id,
            title: `${opts.title} — Knowledge Check`,
            passMarkPercent: 70,
            questions: {
              create: opts.quizQuestions.map((q, qi) => ({
                prompt: q.prompt,
                order: qi,
                answers: {
                  create: q.options.map((text, oi) => ({
                    text,
                    isCorrect: oi === q.correctIndex,
                  })),
                },
              })),
            },
          },
        });
      }
    }

    if (opts.project) {
      const skill = opts.project.skillName ? skills[opts.project.skillName] : undefined;
      await prisma.project.upsert({
        where: { courseId: course.id },
        update: {},
        create: {
          courseId: course.id,
          title: opts.project.title,
          instructions: opts.project.instructions,
          rubric: opts.project.rubric,
          skillId: skill?.id,
        },
      });
    }

    return course;
  }

  // --- 8 sample courses (from the brief's own example list) ----------
  const excelWorkplace = await buildFullCourse({
    title: "Excel for the Workplace",
    slug: "excel-for-the-workplace",
    description:
      "Build practical, everyday Excel skills for office and field work — from clean data entry to your first pivot table.",
    category: "Digital Skills",
    level: "Beginner",
    estimatedHours: 6,
    status: "PUBLISHED",
    instructorId: instructorOne.id,
    moduleTitles: ["Getting Started with Excel", "Formulas and Functions", "Pivot Tables"],
    quizQuestions: [
      {
        prompt: "Which symbol must every Excel formula begin with?",
        options: ["#", "=", "@", "$"],
        correctIndex: 1,
      },
      {
        prompt: "What does the SUM function do?",
        options: [
          "Counts the number of cells",
          "Adds together a range of numbers",
          "Finds the average of a range",
          "Sorts a column alphabetically",
        ],
        correctIndex: 1,
      },
      {
        prompt: "A pivot table is best used to:",
        options: [
          "Format text as bold",
          "Summarize and explore large datasets",
          "Password-protect a workbook",
          "Insert an image",
        ],
        correctIndex: 1,
      },
    ],
    project: {
      title: "Clean and summarize a sample dataset",
      instructions:
        "Download the attached sample dataset, clean up inconsistent entries, and build a pivot table summarizing totals by category.",
      rubric:
        "Full marks require: no duplicate/blank rows remaining, consistent formatting throughout, and a pivot table that correctly summarizes the data by category.",
      skillName: "Microsoft Excel",
    },
  });

  await buildFullCourse({
    title: "Advanced Excel",
    slug: "advanced-excel",
    description: "Level up with lookups, data validation, and dashboard-style reporting in Excel.",
    category: "Digital Skills",
    level: "Intermediate",
    estimatedHours: 8,
    status: "DRAFT",
    instructorId: instructorOne.id,
    moduleTitles: ["VLOOKUP and INDEX/MATCH"],
  });

  await buildFullCourse({
    title: "Monitoring and Evaluation Fundamentals",
    slug: "monitoring-and-evaluation-fundamentals",
    description:
      "The core concepts and tools behind good M&E practice — indicators, data quality, and reporting that decision-makers can actually use.",
    category: "M&E",
    level: "Beginner",
    estimatedHours: 5,
    status: "PUBLISHED",
    instructorId: instructorTwo.id,
    moduleTitles: ["What is M&E?", "Indicators and Data Quality"],
    quizQuestions: [
      {
        prompt: "What does the 'M' in M&E stand for?",
        options: ["Management", "Monitoring", "Measurement", "Mapping"],
        correctIndex: 1,
      },
      {
        prompt: "A good indicator should be:",
        options: [
          "Vague, so it fits many situations",
          "Specific and measurable",
          "Decided after the project ends",
          "Kept secret from stakeholders",
        ],
        correctIndex: 1,
      },
    ],
    project: {
      title: "Design a simple indicator tracking table",
      instructions:
        "For a sample community health project, define 3 indicators and build a tracking table showing targets vs. actuals.",
      rubric:
        "Indicators must be specific and measurable, and the tracking table must clearly show target vs. actual for each.",
      skillName: "Monitoring & Evaluation",
    },
  });

  await buildFullCourse({
    title: "KoboToolbox for Data Collection",
    slug: "kobotoolbox-for-data-collection",
    description: "Design and deploy mobile data collection forms for fieldwork using KoboToolbox.",
    category: "Data Skills",
    level: "Beginner",
    estimatedHours: 4,
    status: "PUBLISHED",
    instructorId: instructorTwo.id,
    moduleTitles: ["Building Your First Form", "Deploying and Collecting Data"],
    quizQuestions: [
      {
        prompt: "KoboToolbox forms can be filled out:",
        options: ["Only on a desktop computer", "Only online", "Online or offline on a mobile device", "Only by SMS"],
        correctIndex: 2,
      },
    ],
    project: {
      title: "Build and deploy a short survey form",
      instructions: "Design a 10-question household survey form in KoboToolbox and submit a test entry.",
      rubric: "Form must include at least one skip-logic rule and one required field, with a successful test submission.",
      skillName: "Data Collection (KoboToolbox)",
    },
  });

  await buildFullCourse({
    title: "Data Visualization with Power BI",
    slug: "data-visualization-with-power-bi",
    description: "Turn raw spreadsheets into clear, decision-ready dashboards using Power BI.",
    category: "Data Skills",
    level: "Intermediate",
    estimatedHours: 7,
    status: "UNDER_REVIEW",
    instructorId: instructorOne.id,
    moduleTitles: ["Power BI Basics", "Building Your First Dashboard"],
  });

  await buildFullCourse({
    title: "Professional Report Writing",
    slug: "professional-report-writing",
    description: "Write clear, well-structured reports that get read and acted on.",
    category: "Communication",
    level: "Beginner",
    estimatedHours: 4,
    status: "PUBLISHED",
    instructorId: instructorTwo.id,
    moduleTitles: ["Structuring a Report", "Writing for Your Audience"],
    quizQuestions: [
      {
        prompt: "An executive summary should typically appear:",
        options: ["At the very end", "At the very beginning", "Only in the appendix", "It's optional and rarely needed"],
        correctIndex: 1,
      },
    ],
    project: {
      title: "Write a one-page project status report",
      instructions: "Using the provided project brief, write a one-page status report for a non-technical audience.",
      rubric: "Report must include a clear summary, current status, and next steps, written in plain language.",
      skillName: "Report Writing",
    },
  });

  await buildFullCourse({
    title: "Project Management Fundamentals",
    slug: "project-management-fundamentals",
    description: "The core planning, tracking, and communication skills behind running a project well.",
    category: "Professional Skills",
    level: "Beginner",
    estimatedHours: 6,
    status: "PUBLISHED",
    instructorId: instructorOne.id,
    moduleTitles: ["Project Planning Basics", "Tracking Progress"],
    quizQuestions: [
      {
        prompt: "A project milestone is best described as:",
        options: [
          "A recurring weekly task",
          "A significant point or event in a project's timeline",
          "The project's total budget",
          "A type of software",
        ],
        correctIndex: 1,
      },
    ],
    project: {
      title: "Build a simple project plan",
      instructions: "Create a project plan with at least 5 tasks, owners, and deadlines for a sample initiative.",
      rubric: "Plan must include clear task owners, realistic deadlines, and at least one identified milestone.",
      skillName: "Project Management",
    },
  });

  await buildFullCourse({
    title: "AI for Workplace Productivity",
    slug: "ai-for-workplace-productivity",
    description: "Practical, responsible ways to use AI tools to work faster without cutting corners.",
    category: "Digital Skills",
    level: "Beginner",
    estimatedHours: 3,
    status: "DRAFT",
    instructorId: instructorTwo.id,
    moduleTitles: ["Getting Started with AI Tools"],
  });

  console.log("8 sample courses created.");

  // --- A learner's enrolment + progress + certificate + skill --------
  const enrolment = await prisma.enrolment.upsert({
    where: { learnerId_courseId: { learnerId: learnerOne.id, courseId: excelWorkplace.id } },
    update: { progressPercent: 100, completedAt: new Date() },
    create: {
      learnerId: learnerOne.id,
      courseId: excelWorkplace.id,
      progressPercent: 100,
      completedAt: new Date(),
    },
  });
  void enrolment;

  const existingCert = await prisma.certificate.findUnique({
    where: { learnerId_courseId: { learnerId: learnerOne.id, courseId: excelWorkplace.id } },
  });
  if (!existingCert) {
    const certificate = await prisma.certificate.create({
      data: {
        certificateNumber: "ESA-DEMO0001",
        learnerId: learnerOne.id,
        courseId: excelWorkplace.id,
        competencyStatement: "Demonstrated competency in Excel for the Workplace.",
      },
    });
    await prisma.certificateAuditLog.create({
      data: { certificateId: certificate.id, action: "ISSUED", notes: "Seed data." },
    });
  }

  await prisma.learnerSkill.upsert({
    where: {
      learnerId_skillId: { learnerId: learnerOne.id, skillId: skills["Microsoft Excel"].id },
    },
    update: { verificationStatus: "DEMONSTRATED" },
    create: {
      learnerId: learnerOne.id,
      skillId: skills["Microsoft Excel"].id,
      verificationStatus: "DEMONSTRATED",
    },
  });

  // Second learner partway through a different course — shows an
  // in-progress state, not just completed ones.
  await prisma.enrolment.upsert({
    where: {
      learnerId_courseId: { learnerId: learnerTwo.id, courseId: excelWorkplace.id },
    },
    update: {},
    create: { learnerId: learnerTwo.id, courseId: excelWorkplace.id, progressPercent: 40 },
  });

  console.log("Learner progress, one certificate, and one skill created.");

  // --- Organization, cohort, opportunity ------------------------------
  const organization = await prisma.organization.upsert({
    where: { ownerId: orgOwner.id },
    update: {},
    create: {
      ownerId: orgOwner.id,
      name: "Kono Community Development Trust",
      description:
        "A fictional community development organization used for demonstration purposes — not a real institution.",
      website: "https://example.org",
    },
  });

  const cohort = await prisma.cohort.upsert({
    where: { id: "demo-cohort-seed-id" },
    update: {},
    create: {
      id: "demo-cohort-seed-id",
      organizationId: organization.id,
      courseId: excelWorkplace.id,
      title: "Q1 Staff Digital Skills Cohort",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: "Koidu Town",
      deliveryMode: "HYBRID",
    },
  });

  await prisma.cohortMember.upsert({
    where: { cohortId_learnerId: { cohortId: cohort.id, learnerId: learnerThree.id } },
    update: {},
    create: { cohortId: cohort.id, learnerId: learnerThree.id },
  });
  await prisma.enrolment.upsert({
    where: {
      learnerId_courseId: { learnerId: learnerThree.id, courseId: excelWorkplace.id },
    },
    update: {},
    create: { learnerId: learnerThree.id, courseId: excelWorkplace.id, progressPercent: 10 },
  });

  await prisma.opportunity.upsert({
    where: { id: "demo-opportunity-seed-id" },
    update: {},
    create: {
      id: "demo-opportunity-seed-id",
      organizationId: organization.id,
      title: "Data & Reporting Internship",
      type: "INTERNSHIP",
      description:
        "A 3-month internship supporting data collection and reporting for community programs in Kono District.",
      eligibilityCriteria:
        "Completed the Excel for the Workplace course; comfortable with basic data entry and spreadsheets.",
      location: "Koidu Town",
    },
  });

  console.log("Organization, cohort, and opportunity created.");
  console.log("\nSeed complete. Sample login (any account): see emails above, password DemoPass123!");
  console.log(`Reviewer account: ${reviewer.email}`);
  console.log(`Admin account: ${platformAdmin.email}`);
  console.log(`Super admin account: ${superAdmin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
