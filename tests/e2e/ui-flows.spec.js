// @ts-check
// Browser-driven UI tests. These exercise the rendered SPA (not just the API)
// and run in the Dockerized Playwright image, so no local browser is required:
//   make e2e-tests
const { test, expect } = require("@playwright/test");
const { login, csrfHeaders, createJob } = require("./helpers");

test.describe("UI flows", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via the API; the cookie is stored in the browser context so
    // the SPA restores the session on navigation.
    await login(page);
  });

  test("authenticated load shows the dashboard and sidebar nav", async ({ page }) => {
    await page.goto("/#dashboard");
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Jobs$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Run History/ })).toBeVisible();
  });

  test("theme toggle switches the document theme", async ({ page }) => {
    await page.goto("/#dashboard");
    const toggle = page.getByRole("button", { name: /Dark Mode|Light Mode/ });
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await toggle.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
      .toBe(!before);
  });

  test("jobs page shows a real health indicator", async ({ page }) => {
    await page.goto("/#jobs");
    // The backend under test is healthy, so the health-driven pill reads "System Healthy".
    await expect(page.getByText("System Healthy")).toBeVisible();
    // The old hard-coded "System Connected" pill must be gone.
    await expect(page.getByText("System Connected")).toHaveCount(0);
  });

  test("a created job appears in the jobs table", async ({ page }) => {
    const name = `UI Job ${Date.now()}`;
    await createJob(page, { name });
    await page.goto("/#jobs");
    await expect(page.getByText(name)).toBeVisible();

    // cleanup
    const jobs = await (await page.request.get("/api/jobs")).json();
    const created = jobs.find((j) => j.name === name);
    if (created) {
      await page.request.delete(`/api/jobs/${created.id}`, { headers: await csrfHeaders(page) });
    }
  });

  test("delete confirm dialog is dismissible with Escape", async ({ page }) => {
    const name = `Del Job ${Date.now()}`;
    const job = await createJob(page, { name });
    await page.goto("/#jobs");

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    // job still exists (delete was cancelled)
    const getRes = await page.request.get(`/api/jobs/${job.id}`);
    expect(getRes.ok()).toBeTruthy();

    await page.request.delete(`/api/jobs/${job.id}`, { headers: await csrfHeaders(page) });
  });

  test("icon-only action buttons expose accessible names", async ({ page }) => {
    const name = `A11y Job ${Date.now()}`;
    const job = await createJob(page, { name });
    await page.goto("/#jobs");

    await expect(page.getByRole("button", { name: `Run ${name}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Edit ${name}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Delete ${name}` })).toBeVisible();

    await page.request.delete(`/api/jobs/${job.id}`, { headers: await csrfHeaders(page) });
  });

  test("create-job schedule toggle is a keyboard-operable switch", async ({ page }) => {
    await page.goto("/#create-job");
    const sw = page.getByRole("switch", { name: /scheduled runs/i });
    await expect(sw).toBeVisible();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.focus();
    await page.keyboard.press("Enter");
    await expect(sw).toHaveAttribute("aria-checked", "true");
  });
});
