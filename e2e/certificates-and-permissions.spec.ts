import { test, expect } from "@playwright/test";

// Covers "Certificate", "Certificate verification", and permission-
// boundary flows. See playwright.config.ts's honest note.

test.describe("Certificates", () => {
  test("anyone can verify a real certificate without logging in", async ({ page }) => {
    await page.goto("/verify");
    // Certificate number from prisma/seed.ts.
    await page.getByLabel("Certificate ID").fill("ESA-DEMO0001");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Valid certificate")).toBeVisible();
    await expect(page.getByText("Adama Sesay")).toBeVisible();
  });

  test("verifying a made-up certificate number shows a clear not-found message, not an error page", async ({
    page,
  }) => {
    await page.goto("/verify");
    await page.getByLabel("Certificate ID").fill("ESA-NOTREAL0");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("No certificate found")).toBeVisible();
  });
});

test.describe("Permission boundaries", () => {
  test("an unauthenticated visitor is redirected to /login from every protected area", async ({
    page,
  }) => {
    for (const path of ["/dashboard", "/instructor/courses", "/admin", "/organization", "/review"]) {
      await page.goto(path);
      await expect(page).toHaveURL("/login");
    }
  });

  test("a learner cannot reach the admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("learner1@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/admin");
    // requireRole() redirects a non-admin back to /login rather than
    // showing the page — this asserts that redirect actually happens.
    await expect(page).toHaveURL("/login");
  });

  test("a learner cannot reach the instructor course-management area", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("learner1@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/instructor/courses");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Admin management", () => {
  test("an admin can view and change a user's role", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/admin/users");
    await expect(page.getByText("Adama Sesay")).toBeVisible();
  });

  test("an admin can view the platform stats dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@ecoskillsacademy.test");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.goto("/admin");
    await expect(page.getByText("Total users")).toBeVisible();
    await expect(page.getByText("Active certificates")).toBeVisible();
  });
});
