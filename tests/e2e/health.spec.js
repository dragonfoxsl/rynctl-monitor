// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Health & availability", () => {
  test("GET /api/health returns healthy status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.db).toBe(true);
    expect(body.checks.scheduler).toBe(true);
  });

  test("SPA index loads without errors", async ({ page }) => {
    const response = await page.goto("/");
    expect(response.status()).toBe(200);
    // Page should contain the app mount point
    await expect(page.locator("#app")).toBeAttached();
  });
});
