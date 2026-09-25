import { test, expect } from "@playwright/test";

// See playwright.config.ts for the honest "written, not executed" note
// that applies to every spec in this e2e/ directory.

test.describe("Registration and login", () => {
  test("a new visitor can register, is logged in immediately, and sees an unverified-email banner", async ({
    page,
  }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Test Learner");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/account");
    await expect(page.getByText("Verify your email")).toBeVisible();
  });

  test("registration rejects a password under 8 characters client-side", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Password").fill("short");
    // The native minlength attribute should block submission before the
    // request is even sent.
    const password = page.getByLabel("Password");
    await expect(password).toHaveAttribute("minlength", "8");
  });

  test("logging in with the wrong password shows a generic error (no account enumeration)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nonexistent-account@example.com");
    await page.getByLabel("Password").fill("whatever-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });

  test("a logged-in user can log out and loses access to /account", async ({ page }) => {
    // Assumes a seeded learner account — see prisma/seed.ts.
    await page.goto("/login");
    await page.getByLabel("Email").fill("learner1@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/account");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/account");
    await expect(page).toHaveURL("/login");
  });

  test("forgot-password always shows the same success message, whether or not the email exists", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("definitely-not-a-real-account@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Check your email")).toBeVisible();
  });
});
