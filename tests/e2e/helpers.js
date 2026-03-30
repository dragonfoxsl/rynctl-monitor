/**
 * Shared helpers for Playwright E2E tests.
 */

/**
 * Log in via the API and store the session cookie so subsequent
 * page navigations are already authenticated.
 */
async function login(page, username = "admin", password = "admin") {
  const res = await page.request.post("/api/auth/login", {
    data: { username, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

async function csrfHeaders(page) {
  const res = await page.request.get("/api/auth/csrf");
  if (!res.ok()) {
    throw new Error(`CSRF fetch failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return { "X-CSRF-Token": body.csrf_token };
}

/**
 * Create a job via the API and return the created job object.
 */
async function createJob(page, overrides = {}) {
  const payload = {
    name: overrides.name || "Test Job",
    source: overrides.source || "/tmp/src",
    destination: overrides.destination || "/tmp/dest",
    flags: overrides.flags || "-avh",
    ...overrides,
  };
  const res = await page.request.post("/api/jobs", {
    data: payload,
    headers: await csrfHeaders(page),
  });
  if (!res.ok()) {
    throw new Error(`Create job failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { login, csrfHeaders, createJob };
