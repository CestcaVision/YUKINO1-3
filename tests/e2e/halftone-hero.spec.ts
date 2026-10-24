import { expect, test } from "@playwright/test";

test("the hero reveals colour under the pointer, ripples on click, and supports the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const stage = page.locator(".halftone-reveal");
  const canvas = stage.locator("canvas");
  await expect(stage).toHaveAttribute("data-ready", "true");
  // Let the original intro finish before comparing rendered image pixels.
  await page.waitForTimeout(1700);
  const printed = await canvas.screenshot();
  const bounds = (await stage.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.3,
  );
  await page.waitForTimeout(250);
  const revealed = await canvas.screenshot();
  expect(revealed.equals(printed)).toBe(false);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect((await canvas.screenshot()).equals(revealed)).toBe(false);

  const originalButton = page.getByRole("button", {
    name: "Show original image",
    exact: true,
  });
  await originalButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Show halftone image" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveCSS("opacity", "0");
  await page.keyboard.press("Space");
  await expect(originalButton).toHaveAttribute("aria-pressed", "false");
  await expect(canvas).toHaveCSS("opacity", "1");

  await page.getByRole("link", { name: "Explore my work" }).click();
  await expect(page).toHaveURL(/#featured-work$/);
  const works = page.getByRole("region", { name: "Something I’ve made" });
  await expect(
    works.getByRole("img", { name: /Interactive Möbius strip/ }),
  ).toBeVisible();
  await expect(page.locator(".hero .mobius-surface")).toHaveCount(0);
});

test("reduced motion shows the original and reacts to preference changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = page.locator(".halftone-reveal-image");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Show original image" }),
  ).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".halftone-reveal")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Show original image" }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".halftone-reveal")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(image).toBeVisible();
});

test("WebGL unavailable leaves a loaded original image and hides unusable controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        ...args: Parameters<typeof getContext>
      ) {
        if (String(args[0]).startsWith("webgl")) return null;
        return getContext.apply(this, args);
      },
    });
  });
  await page.goto("/");
  const image = page.locator(".halftone-reveal-image");
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.locator(".halftone-reveal-canvas")).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(
    page.getByRole("button", { name: "Show original image" }),
  ).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the portrait, introduction, and Works remain available", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hi, I’m Yukino." }),
    ).toBeVisible();
    const image = page.locator(".halftone-reveal-image");
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "Show original image" }),
    ).toBeHidden();
    await page.getByRole("link", { name: "Explore my work" }).click();
    await expect(
      page
        .getByRole("region", { name: "Something I’ve made" })
        .getByRole("img", { name: /Interactive Möbius strip/ }),
    ).toBeVisible();
  });
});

test("a narrow touch screen reveals on tap and preserves vertical scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.clock.install();
  await page.goto("/");
  const stage = page.locator(".halftone-reveal");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(stage).toHaveCSS("touch-action", "pan-y");
  // Freeze a completed intro, then advance the tap animation explicitly.
  // A slow CI screenshot must not let the short-lived ripple expire first.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1700));
  const before = await stage.locator("canvas").screenshot();
  const bounds = (await stage.boundingBox())!;
  await page.touchscreen.tap(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.35,
  );
  await page.clock.runFor(160);
  expect((await stage.locator("canvas").screenshot()).equals(before)).toBe(
    false,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
