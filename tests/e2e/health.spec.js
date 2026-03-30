// @ts-check
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const hasBuiltFrontend = fs.existsSync(
  path.join(__dirname, "../../static/dist/index.html")
);

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
    test.skip(!hasBuiltFrontend, "built frontend assets are required for SPA smoke tests");
    const response = await page.goto("/");
    expect(response.status()).toBe(200);
    await expect(page.locator("#app")).toBeAttached();
  });
});
