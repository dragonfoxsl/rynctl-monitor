// @ts-check
const { test, expect } = require("@playwright/test");
const { login, csrfHeaders } = require("./helpers");

const source = "/tmp/rynctl-scheduler-src/";
const destination = "/tmp/rynctl-scheduler-dst/";

function nextCronMinute() {
  const now = new Date();
  const offsetMinutes = now.getUTCSeconds() > 45 ? 2 : 1;
  const target = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return {
    cron: `${target.getUTCMinutes()} ${target.getUTCHours()} * * *`,
    waitMs: target.getTime() - now.getTime() + 25000,
  };
}

test.describe("Scheduled jobs", () => {
  test("scheduled rsync job fires and records a successful run", async ({ page }) => {
    test.setTimeout(180000);

    await login(page);

    const { cron, waitMs } = nextCronMinute();
    const name = `Scheduled E2E Job ${Date.now()}`;
    let jobId;

    const createRes = await page.request.post("/api/jobs", {
      headers: await csrfHeaders(page),
      data: {
        name,
        source,
        destination,
        flags: "-avh",
        schedule_enabled: 1,
        schedule_cron: cron,
        retry_max: 0,
        max_runtime: 30,
        tags: "playwright-scheduler-smoke",
      },
    });
    expect(createRes.ok()).toBeTruthy();

    const job = await createRes.json();
    jobId = job.id;

    try {
      await page.goto("/#jobs");
      await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(waitMs);

      let runs = [];
      await expect
        .poll(
          async () => {
            const runsRes = await page.request.get(`/api/jobs/${jobId}/runs`);
            if (!runsRes.ok()) return "missing";
            runs = await runsRes.json();
            return runs[0]?.status || "none";
          },
          { timeout: 45000, intervals: [1000, 2000, 5000] }
        )
        .toBe("success");

      expect(runs[0].exit_code).toBe(0);
      expect(runs[0].files_transferred).toBeGreaterThanOrEqual(1);
      expect(runs[0].bytes_transferred).toBeGreaterThanOrEqual(1);
    } finally {
      if (jobId) {
        await page.request.delete(`/api/jobs/${jobId}`, {
          headers: await csrfHeaders(page),
        });
      }
    }
  });
});
