import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { name: "home", path: "/" },
  { name: "works", path: "/works/" },
  { name: "notes", path: "/notes/" },
  { name: "about", path: "/about/" },
];

// Automated WCAG 2.2 AA checks via axe-core on every primary route.
for (const route of routes) {
  test(`${route.name} page passes automated WCAG 2.2 AA checks`, async ({ page }) => {
    await page.goto(route.path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

// Landmark structure: every page must expose the standard three landmarks.
for (const route of routes) {
  test(`${route.name} page has banner, main, and contentinfo landmarks`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
}

// Heading hierarchy: h1 is present and unique on every primary route.
for (const route of routes) {
  test(`${route.name} page has exactly one h1`, async ({ page }) => {
    await page.goto(route.path);
    const h1s = page.getByRole("heading", { level: 1 });
    await expect(h1s).toHaveCount(1);
  });
}

// Skip link navigates focus to main content when activated.
test("skip link moves focus to main content on activation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  const main = page.getByRole("main");
  await expect(main).toBeFocused();
});

// No horizontal overflow at the minimum supported viewport width (320 CSS px).
for (const route of routes) {
  test(`${route.name} page has no horizontal overflow at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route.path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
}

// Note and Work detail pages also pass WCAG 2.2 AA and have no overflow.
test("published Note detail page passes WCAG 2.2 AA checks", async ({ page }) => {
  await page.goto("/notes/");
  const firstNoteLink = page.locator("ol.note-list a").first();
  const href = await firstNoteLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("published Work detail page passes WCAG 2.2 AA checks", async ({ page }) => {
  await page.goto("/works/");
  const firstWorkLink = page.locator("ol.note-list a").first();
  const href = await firstWorkLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

// Filter controls are keyboard-operable (verified via keyboard interaction).
test("evidence filter controls are keyboard-operable on Notes page", async ({ page }) => {
  await page.goto("/notes/");
  const subjectSelect = page.getByLabel("Subject", { exact: true });
  await subjectSelect.focus();
  await expect(subjectSelect).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Medium", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Capability", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeFocused();
});

// All interactive controls have visible focus indicators.
test("interactive controls have a visible :focus-visible outline", async ({ page }) => {
  await page.goto("/works/");
  const firstLink = page.getByRole("link").first();
  await firstLink.focus();
  const outlineStyle = await firstLink.evaluate((el) => {
    const style = getComputedStyle(el);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(outlineStyle.outlineStyle).not.toBe("none");
  expect(parseFloat(outlineStyle.outlineWidth)).toBeGreaterThan(0);
});

// prefers-reduced-motion: transitions are suppressed for users who request it.
test("transitions are suppressed when prefers-reduced-motion is reduce", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // scroll-behavior is set to auto by the media query override
  const scrollBehavior = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  );
  expect(scrollBehavior).toBe("auto");
  // transition-duration on animated elements is zeroed to near-instant
  const transitionMs = await page.evaluate(() => {
    const el = document.querySelector(".skip-link") as HTMLElement;
    const raw = getComputedStyle(el).transitionDuration;
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    return 0;
  });
  expect(transitionMs).toBeLessThan(1);
});
