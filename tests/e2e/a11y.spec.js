// @ts-check
// Automated accessibility scan (axe-core) over the main authenticated pages.
// Runs in the Dockerized Playwright image: make e2e-tests
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { login } = require("./helpers");

// Read-oriented pages we expect to be free of serious/critical violations.
// Form-heavy CreateJob and modal dialogs are tracked separately in TEST_PLAN.md.
const PAGES = [
  ["dashboard", "#dashboard"],
  ["jobs", "#jobs"],
  ["runs", "#runs"],
  ["flags", "#flags"],
];

test.describe("Accessibility (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const [name, hash] of PAGES) {
    test(`no serious or critical a11y violations on ${name}`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      );

      // Surface a readable summary on failure.
      const summary = blocking.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
      }));
      expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
    });
  }
});
