import { test, expect } from "@playwright/test";

// Covers the brief's "Course browsing", "Course enrolment", "Learning",
// "Quiz", "Practical project" flows in one continuous journey. Assumes
// prisma/seed.ts has been run — see playwright.config.ts's honest note.

test.describe("Core learning loop", () => {
  test.use({ storageState: undefined });

  async function loginAsLearner(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill("learner2@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/account");
  }

  test("a visitor can browse and search the public course catalogue without logging in", async ({
    page,
  }) => {
    await page.goto("/courses");
    await expect(page.getByText("Excel for the Workplace")).toBeVisible();

    await page.getByPlaceholder("Search courses…").fill("Excel");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Excel for the Workplace")).toBeVisible();
  });

  test("a logged-in learner can enrol in a published course", async ({ page }) => {
    await loginAsLearner(page);
    await page.goto("/courses/excel-for-the-workplace");
    await page.getByRole("button", { name: "Enrol — it's free" }).click();
    await expect(page).toHaveURL(/\/learn\//);
  });

  test("a learner can open a lesson and mark it complete", async ({ page }) => {
    await loginAsLearner(page);
    await page.goto("/courses/excel-for-the-workplace");
    // learner2 is already enrolled with 40% progress per the seed data.
    await page.getByRole("button", { name: "Continue learning" }).click();
    await page.getByText("Getting Started with Excel").click();
    await page.getByRole("link", { name: /Getting Started with Excel — Overview/ }).click();
    await page.getByRole("button", { name: "Mark lesson complete" }).click();
    await expect(page.getByText("Lesson complete")).toBeVisible();
  });

  test("a learner can take the quiz and sees a pass/fail result, never the correct answers beforehand", async ({
    page,
  }) => {
    await loginAsLearner(page);
    await page.goto("/learn/excel-for-the-workplace/quiz");

    // The quiz's answer options render, but nothing in the page HTML
    // should reveal which option is correct before submitting — this is
    // a behavioral proxy for "isCorrect never reaches the client".
    const pageContent = await page.content();
    expect(pageContent).not.toContain("isCorrect");

    // Answer every question (radio inputs) and submit.
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();
    for (let i = 0; i < count; i += 2) {
      await radios.nth(i).check();
    }
    await page.getByRole("button", { name: /Submit quiz/ }).click();
    await expect(page.getByText(/Passed|Not passed/)).toBeVisible();
  });

  test("a learner can submit their practical project", async ({ page }) => {
    await loginAsLearner(page);
    await page.goto("/learn/excel-for-the-workplace/project");
    await page.getByLabel("Link to your work").fill("https://example.com/my-submission");
    await page.getByRole("button", { name: "Submit for grading" }).click();
    await expect(page.getByText("Awaiting grading")).toBeVisible();
  });
});
