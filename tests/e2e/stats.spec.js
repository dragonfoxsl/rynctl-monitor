// @ts-check
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.describe("Stats API", () => {
  test("GET /api/stats requires auth", async ({ request }) => {
    const res = await request.get("/api/stats");
    expect(res.status()).toBe(401);
  });

  test("GET /api/stats returns dashboard statistics", async ({ page }) => {
    await login(page);
    const res = await page.request.get("/api/stats");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("total_jobs");
    expect(body).toHaveProperty("scheduled");
    expect(body).toHaveProperty("total_runs");
    expect(body).toHaveProperty("successful");
    expect(body).toHaveProperty("failed");
    expect(body).toHaveProperty("running");
    expect(body).toHaveProperty("data_transferred");
    expect(body).toHaveProperty("daily");
    expect(Array.isArray(body.daily)).toBeTruthy();
  });
});
