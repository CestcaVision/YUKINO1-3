import { expect, test, type Page } from "@playwright/test";

const FIXTURE_URL = "/works/fixture-correlation-regression/";

async function loadExperiment(page: Page) {
  await page.goto(FIXTURE_URL);
  await page.waitForSelector("#ce-n", { state: "visible" });
}

async function setRange(page: Page, id: string, value: number) {
  await page.locator(id).evaluate((el: HTMLInputElement, val: string) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, String(value));
}

test("correlation experiment renders with correct initial state", async ({
  page,
}) => {
  await loadExperiment(page);
  const summary = page.locator(".correlation-summary");
  await expect(summary).toContainText("r =");
  await expect(summary).toContainText("40 points");
  await expect(summary).not.toContainText("outlier");
  await expect(summary).not.toContainText("Confounder active");
});

test("correlation experiment controls update the scatter plot and summary", async ({
  page,
}) => {
  await loadExperiment(page);
  const summary = page.locator(".correlation-summary");

  await setRange(page, "#ce-n", 80);
  await expect(summary).toContainText("80 points");

  await setRange(page, "#ce-outliers", 3);
  await expect(summary).toContainText("3 outliers");

  await page.locator("#ce-confound").check();
  await expect(summary).toContainText("Confounder active");

  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(summary).toContainText("40 points");
  await expect(summary).not.toContainText("outlier");
  await expect(summary).not.toContainText("Confounder active");
});

test("correlation experiment produces reproducible results with the same seed and parameters", async ({
  page,
}) => {
  await loadExperiment(page);
  const summary = page.locator(".correlation-summary");

  await page.locator("#ce-seed").fill("1234");
  const firstResult = await summary.textContent();

  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(summary).toContainText("40 points");

  await page.locator("#ce-seed").fill("1234");
  const secondResult = await summary.textContent();

  expect(firstResult).toBe(secondResult);
});

test("correlation experiment scatter plot has accessible role, name, and live text summary", async ({
  page,
}) => {
  await loadExperiment(page);

  const svg = page.locator(".correlation-plot");
  await expect(svg).toHaveAttribute("role", "img");
  await expect(svg).toHaveAttribute("aria-labelledby", "ce-title");

  const title = page.locator("#ce-title");
  await expect(title).toContainText("Pearson r =");

  const summary = page.locator(".correlation-summary[aria-live]");
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("r =");
  await expect(summary).toContainText("points");
});

test("correlation experiment handles boundary parameters without error", async ({
  page,
}) => {
  await loadExperiment(page);
  const summary = page.locator(".correlation-summary");

  await setRange(page, "#ce-n", 10);
  await expect(summary).toContainText("10 points");
  await expect(summary).toContainText("r =");

  await setRange(page, "#ce-n", 200);
  await expect(summary).toContainText("200 points");
  await expect(summary).toContainText("r =");

  await setRange(page, "#ce-outliers", 10);
  await expect(summary).toContainText("10 outliers");
  await expect(summary).toContainText("r =");
});

test("correlation experiment is fully operable with prefers-reduced-motion: reduce", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loadExperiment(page);
  const summary = page.locator(".correlation-summary");

  await setRange(page, "#ce-n", 60);
  await expect(summary).toContainText("60 points");

  await page.locator("#ce-confound").check();
  await expect(summary).toContainText("Confounder active");

  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(summary).toContainText("40 points");
  await expect(summary).not.toContainText("Confounder active");
});
