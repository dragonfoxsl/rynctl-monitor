// @ts-check
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.describe("UI smoke tests", () => {
  test("unauthenticated user sees login form", async ({ page }) => {
    await page.goto("/");
    // The SPA should render a login form or prompt
    await expect(
      page.getByRole("button", { name: /log\s*in|sign\s*in/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test("login via UI and see dashboard", async ({ page }) => {
    await page.goto("/");

    // Fill login form
    await page.getByPlaceholder(/user/i).fill("admin");
    await page.getByPlaceholder(/pass/i).fill("admin");
    await page.getByRole("button", { name: /log\s*in|sign\s*in/i }).click();

    // Should navigate to dashboard — look for common dashboard indicators
    await expect(
      page.getByText(/dashboard|jobs|overview/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("navigation links are present after login", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/user/i).fill("admin");
    await page.getByPlaceholder(/pass/i).fill("admin");
    await page.getByRole("button", { name: /log\s*in|sign\s*in/i }).click();

    // Wait for app to load
    await expect(
      page.getByText(/dashboard|jobs|overview/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Check for navigation elements
    const nav = page.locator("nav, [role=navigation], .sidebar, .nav");
    await expect(nav.first()).toBeVisible();
  });
});
