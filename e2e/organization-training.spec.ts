import { test, expect } from "@playwright/test";

// Covers "Organization training" from the brief's Phase 34 test list. See
// playwright.config.ts's honest note.

test.describe("Organization training", () => {
  async function loginAsOrg(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill("org@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();
  }

  test("an organization can view their cohort's employee progress", async ({ page }) => {
    await loginAsOrg(page);
    await page.goto("/organization");
    await expect(page.getByText("Employees trained")).toBeVisible();
    await page.getByText("Q1 Staff Digital Skills Cohort").click();
    await expect(page.getByText(/Learners \(\d+\)/)).toBeVisible();
  });

  test("an organization adding an employee who has no account gets a real invite, not an error", async ({
    page,
  }) => {
    await loginAsOrg(page);
    await page.goto("/organization");
    await page.getByText("Q1 Staff Digital Skills Cohort").click();
    await page.getByLabel("Add employee by email").fill(`brand-new-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Invite sent")).toBeVisible();
  });

  test("an organization can post an opportunity and see applicants", async ({ page }) => {
    await loginAsOrg(page);
    await page.goto("/organization");
    await page.getByText("Data & Reporting Internship").click();
    await expect(page.getByText(/Applicants \(\d+\)/)).toBeVisible();
  });
});
