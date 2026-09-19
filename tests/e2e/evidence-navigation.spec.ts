import { expect, test } from "@playwright/test";

test("readers filter published Notes with keyboard-accessible controlled classifications", async ({ page }) => {
  await page.goto("/notes/");
  await expect(page.getByLabel("Subject", { exact: true })).toBeVisible();
  await page.getByLabel("Subject", { exact: true }).selectOption("Mathematics");
  await expect(page.getByRole("link", { name: "Completing the square, visually" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tracing a loop" })).toBeHidden();
  await page.getByLabel("Medium", { exact: true }).selectOption("Interactive demonstration");
  await expect(page.getByRole("status")).toHaveText("0 results");
  await expect(page.getByText("No published evidence matches these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toHaveText("2 results");
  await page.getByLabel("Capability", { exact: true }).selectOption("Builds a computational model");
  await expect(page.getByRole("link", { name: "Tracing a loop" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Completing the square, visually" })).toBeHidden();
  await expect(page.getByRole("option", { name: "Economics", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Interprets evidence", exact: true })).toHaveCount(0);
});

test("Home connects featured evidence, the latest Note and chronological published activity", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Featured Work" }).getByRole("link", { name: "Sorting algorithm visualiser" })).toHaveAttribute("href", "/works/fixture-sorting-algorithm-visualiser/");
  await expect(page.getByRole("region", { name: "Latest Note" }).getByRole("link", { name: "Completing the square, visually" })).toHaveAttribute("href", "/notes/completing-the-square/");
  const activity = page.getByRole("region", { name: "Recent activity" });
  await expect(activity.getByRole("listitem")).toHaveCount(6);
  await expect(activity.getByRole("listitem").nth(0)).toContainText("Fixture research presentation");
  await expect(activity.getByRole("listitem").nth(1)).toContainText("Completing the square, visually");
  await expect(activity.getByRole("listitem").nth(2)).toContainText("Sorting algorithm visualiser");
  await expect(activity.getByRole("listitem").nth(3)).toContainText("Tracing a loop");
  await expect(activity.getByRole("listitem").nth(4)).toContainText("Fixture model check");
  await expect(activity.getByRole("listitem").nth(5)).toContainText("Correlation and regression experiment");
  await expect(page.getByText(/Hidden (draft|review)/)).toHaveCount(0);
  for (const link of await activity.getByRole("link").all()) {
    await link.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goBack();
  }
});

test("Works filters hide unmatched groups and every Capability links to published evidence", async ({ page, request }) => {
  await page.goto("/works/");
  const works = page.locator("evidence-filters");
  await page.getByLabel("Subject", { exact: true }).focus();
  await page.keyboard.press("m");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("Mathematics");
  await expect(works.getByRole("link", { name: "Fixture model check" })).toBeVisible();
  await expect(works.getByRole("link", { name: "Correlation and regression experiment" })).toBeVisible();
  await expect(works.getByRole("heading", { name: "Interactive systems" })).toBeVisible();
  await page.getByLabel("Medium", { exact: true }).selectOption("Web experience");
  await expect(page.getByRole("status")).toHaveText("1 result");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Capability", { exact: true }).selectOption("Builds a computational model");
  await expect(works.getByRole("link", { name: "Sorting algorithm visualiser" })).toBeVisible();
  await expect(works.getByRole("link", { name: "Fixture model check" })).toBeHidden();
  await expect(works.getByRole("link", { name: "Correlation and regression experiment" })).toBeHidden();
  await expect(page.getByRole("option", { name: "3D animation", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Interprets evidence", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Visual explanations" })).toHaveCount(0);
  const capabilities = page.getByRole("region", { name: "Capabilities" });
  for (const capability of await capabilities.getByRole("article").all()) {
    const links = capability.getByRole("link");
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/(works|notes)\//);
      expect((await request.get(href!)).status()).toBe(200);
    }
  }
});

for (const width of [1440, 375]) {
  test(`primary destinations remain consistent on direct access and refresh at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) errors.push(message.text());
    });
    for (const [name, path] of [["Home", "/"], ["Works", "/works/"], ["Notes", "/notes/"], ["About", "/about/"]]) {
      await page.goto(path);
      await page.reload();
      if (width === 375) await page.getByRole("button", { name: "Open navigation menu" }).click();
      const navigation = page.getByRole("navigation", { name: width === 375 ? "Mobile" : "Primary", exact: true });
      await expect(navigation.getByRole("link")).toHaveText(["Home", "Works", "Notes", "About"]);
      await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
      await navigation.getByRole("link", { name: "Works", exact: true }).click();
      await expect(page).toHaveURL(/\/works\/$/);
      await expect(page).toHaveTitle(/Works/);
      await expect(page.getByRole("heading", { name: "Works", exact: true })).toBeVisible();
      if (width === 375) await expect(page.getByRole("navigation", { name: "Mobile" })).toBeHidden();
    }
    await page.getByLabel("Subject", { exact: true }).selectOption("Mathematics");
    await expect(page.getByRole("status")).toHaveText("2 results");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`works-${width}.png`), fullPage: true });
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Recent activity" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test.describe("static evidence", () => {
  test.use({ javaScriptEnabled: false });
  test("Home and filtered indexes preserve evidence without JavaScript", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Recent activity" }).getByRole("listitem")).toHaveCount(6);
    for (const [route, linkCount] of [["/works/", 3], ["/notes/", 2]] as const) {
      await page.goto(route);
      await expect(page.getByRole("form", { name: "Filter published evidence" })).toBeHidden();
      await expect(page.locator("evidence-filters").getByRole("link")).toHaveCount(linkCount);
      await page.locator("evidence-filters").getByRole("link").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
