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
        // color-contrast is a known, tracked design-token debt (the accent blue
        // and muted text fall below AA on light surfaces). Tracked in
        // docs/TEST_PLAN.md (TC-A5); excluded here so this suite enforces the
        // structural a11y rules already fixed (roles, names, labels, aria).
        .disableRules(["color-contrast"])
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
