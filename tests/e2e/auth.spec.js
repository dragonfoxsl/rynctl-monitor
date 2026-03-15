// @ts-check
const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.describe("Authentication API", () => {
  test("login with valid credentials returns token and user info", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/login", {
      data: { username: "admin", password: "admin" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("token");
    expect(body.username).toBe("admin");
    expect(body.role).toBe("admin");
  });

  test("login with wrong password returns 401", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { username: "admin", password: "wrong" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me without session returns 401", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });

  test("GET /api/auth/me with session returns current user", async ({
    page,
  }) => {
    await login(page);
    const res = await page.request.get("/api/auth/me");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.username).toBe("admin");
    expect(body.role).toBe("admin");
  });

  test("POST /api/auth/logout clears session", async ({ page }) => {
    await login(page);
    const logoutRes = await page.request.post("/api/auth/logout");
    expect(logoutRes.ok()).toBeTruthy();

    // Session should now be invalid
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.status()).toBe(401);
  });
});
