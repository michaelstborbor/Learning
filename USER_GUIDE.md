# User Guide

How to use EcoSkills Academy, by role. If you manage the platform itself,
see `ADMIN_GUIDE.md` instead.

## For learners

**Getting started.** Register for free at `/register`. You can start
learning right away — confirming your email isn't required to use the
platform, just recommended (there's a reminder banner until you do).

**Finding a course.** Browse or search `/courses` — filter by category or
level, or search by keyword. Every course shows its level, estimated time,
and whether it includes a certificate-eligible practical project.

**Learning.** Once enrolled, work through each module's lessons in order —
"Mark lesson complete" as you go. Your progress bar updates automatically.

**The quiz and the project are different things.** A course's knowledge quiz
checks whether you understood the material. Its practical project is where
you actually *do* the work and get graded by a real person. Completing
lessons and passing the quiz alone is never enough to earn a certificate if
the course has a project — you have to actually submit and pass that too.
This is intentional: EcoSkills Academy certifies what you can do, not just
what you watched.

**Submitting a project.** You'll submit a link (to a document, spreadsheet,
or file hosted elsewhere — there's no direct file upload yet) along with any
notes for your grader. You'll see your submission's status change from
"Awaiting grading" to a pass/fail score with feedback once it's reviewed.

**Certificates.** Issued automatically the moment you meet a course's real
criteria — you don't request one. Find yours at `/certificates`; anyone can
verify it's genuine at `/verify`, no account needed.

**Skills Passport (`/skills`).** Every skill you've demonstrated through a
passing project, evidence-backed — not a list of courses you clicked through.

**Opportunities (`/opportunities`).** Internships, jobs, and mentorships
posted by organizations. Browse without an account; apply once logged in.
Track your applications at `/applications`.

**Recommendations.** Your dashboard suggests other courses based on what
you're already learning — the reasoning is always shown plainly (e.g.
"Because you're learning Digital Skills"). There's no hidden algorithm
behind it.

## For instructors

You need the Instructor role, granted by an admin (see `ADMIN_GUIDE.md`) —
there's no self-service signup for this role.

**Creating a course.** From `/instructor/courses`, click "New course." It
starts as a Draft — visible only to you.

**Building it out.** Open your course to add modules and lessons, build a
knowledge quiz (multiple choice, mark the correct answer per question), and
set up the practical project (instructions, grading rubric, and — this
matters — the specific skill it proves, so it feeds a learner's Skills
Passport correctly).

**Getting it published.** When ready, click "Submit for review." A Content
Reviewer looks it over and either approves it or sends it back with specific
feedback on what to fix — you'll see that feedback right on your course page
if it's sent back. Once approved, an admin publishes it. You can't publish
your own course directly — this is a deliberate check, not a bug.

**Grading.** Submissions waiting for your review appear right on your
course's management page. Score 0–100 and leave feedback; a score of 70 or
above counts as a pass.

**Your course's analytics.** Right on the same page: how many are enrolled,
completion rate, quiz pass rate, and how many certificates the course has
produced.

## For organizations

You need the Organization role, granted by an admin.

**Setting up.** Visit `/organization` — the first time, you'll set up your
organization's profile (name, description, website).

**Running a cohort.** Create a cohort tied to any published course, with
start/end dates, a location, and delivery mode (online, in-person, or
hybrid). Add employees by email — if they already have an account, they're
added instantly; if not, they get a real invite email, and joining the
cohort happens automatically the moment they register through that link.

**Tracking progress.** Each cohort's page shows every member's real progress
and whether they've earned a certificate — pulled from the same data the
learner sees themselves, not a separate estimate.

**Attendance.** For in-person or hybrid cohorts, mark attendance by date
right from the cohort page.

**Posting opportunities.** From your organization dashboard, post an
internship, job, apprenticeship, or mentorship. Review and move applicants
through a status pipeline (Applied → Shortlisted → Interview → Selected/
Rejected) from the opportunity's page.

## For content reviewers

You need the Content Reviewer role, granted by an admin.

Your one job: `/review` shows every course an instructor has submitted.
Read it over — description, structure, whether it has a quiz and project —
and either approve it or send it back with feedback explaining exactly what
needs to change. You can't publish a course yourself; that's a separate
admin action once you've approved it.
