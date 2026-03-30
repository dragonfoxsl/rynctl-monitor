// @ts-check
const { test, expect } = require("@playwright/test");
const { login, csrfHeaders, createJob } = require("./helpers");

test.describe("Jobs API", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("list jobs returns an array", async ({ page }) => {
    const res = await page.request.get("/api/jobs");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("create, read, update, delete a job", async ({ page }) => {
    // Create
    const job = await createJob(page, { name: "CRUD Test Job" });
    expect(job.id).toBeDefined();
    expect(job.name).toBe("CRUD Test Job");
    expect(job.source).toBe("/tmp/src");

    // Read
    const getRes = await page.request.get(`/api/jobs/${job.id}`);
    expect(getRes.ok()).toBeTruthy();
    const fetched = await getRes.json();
    expect(fetched.name).toBe("CRUD Test Job");

    // Update
    const putRes = await page.request.put(`/api/jobs/${job.id}`, {
      data: { name: "Updated Job" },
      headers: await csrfHeaders(page),
    });
    expect(putRes.ok()).toBeTruthy();
    const updated = await putRes.json();
    expect(updated.name).toBe("Updated Job");

    // Delete
    const delRes = await page.request.delete(`/api/jobs/${job.id}`, {
      headers: await csrfHeaders(page),
    });
    expect(delRes.ok()).toBeTruthy();

    // Verify gone
    const gone = await page.request.get(`/api/jobs/${job.id}`);
    expect(gone.status()).toBe(404);
  });

  test("create job validates required fields", async ({ page }) => {
    const res = await page.request.post("/api/jobs", {
      data: { name: "", source: "", destination: "" },
      headers: await csrfHeaders(page),
    });
    expect(res.ok()).toBeFalsy();
  });

  test("preview returns rsync command string", async ({ page }) => {
    const job = await createJob(page, { name: "Preview Job" });
    const res = await page.request.get(`/api/jobs/${job.id}/preview`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.command).toContain("rsync");
    expect(body.command).toContain("/tmp/src");

    // Cleanup
    await page.request.delete(`/api/jobs/${job.id}`, {
      headers: await csrfHeaders(page),
    });
  });

  test("job runs list is initially empty", async ({ page }) => {
    const job = await createJob(page, { name: "Runs Job" });
    const res = await page.request.get(`/api/jobs/${job.id}/runs`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);

    await page.request.delete(`/api/jobs/${job.id}`, {
      headers: await csrfHeaders(page),
    });
  });

  test("tags endpoint returns an array", async ({ page }) => {
    const res = await page.request.get("/api/jobs/tags");
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });
});
