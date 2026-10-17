import { expect, test } from "@playwright/test";

test("Customize changes the print live without moving the hero, then resets and closes with Escape", async ({
  page,
}) => {
  await page.goto("/");
  const stage = page.locator(".halftone-reveal");
  await expect(stage).toHaveAttribute("data-ready", "true");
  await page.waitForTimeout(1700);
  const heroBefore = await page.locator(".hero").evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    top: element.getBoundingClientRect().top + scrollY,
  }));
  const canvas = stage.locator("canvas");
  const printed = await canvas.screenshot();
  const customize = page.locator(".halftone-customizer summary");
  await customize.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("group", { name: "Make it your own." });
  await expect(panel).toBeVisible();
  expect(
    await page.locator(".hero").evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      top: element.getBoundingClientRect().top + scrollY,
    })),
  ).toEqual(heroBefore);
  await panel.getByLabel("Preset", { exact: true }).selectOption("riso");
  await expect(panel.getByLabel("Mode", { exact: true })).toHaveValue(
    "duotone",
  );
  await expect(panel.getByLabel("Ink", { exact: true })).toHaveValue("#2442ff");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(customize).toBeFocused();
  expect((await canvas.screenshot()).equals(printed)).toBe(false);
  await customize.click();
  await panel.getByLabel("Shape", { exact: true }).selectOption("square");
  await expect(panel.getByLabel("Preset", { exact: true })).toHaveValue(
    "custom",
  );
  const size = panel.getByRole("slider", { name: /Cell size/ });
  await size.focus();
  await page.keyboard.press("ArrowRight");
  await expect(size).toHaveValue("8");
  await panel.getByRole("switch", { name: "Invert", exact: true }).check();
  await expect(
    panel.getByRole("switch", { name: "Invert", exact: true }),
  ).toBeChecked();
  await panel.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(size).toHaveValue("6");
  await expect(panel.getByLabel("Ink", { exact: true })).toHaveValue("#0d0d0d");
  await expect(panel.getByLabel("Preset", { exact: true })).toHaveValue(
    "newsprint",
  );
  await expect(
    panel.getByRole("switch", { name: "Invert", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(panel).toBeHidden();
});

test("Hologram uses a blue opacity field, stays still when idle and reveals on interaction", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const stage = page.locator(".halftone-reveal");
  await expect(stage).toHaveAttribute("data-ready", "true");
  await page.waitForTimeout(1700);
  const canvas = stage.locator("canvas");
  const newsprint = await canvas.screenshot();
  const customize = page.locator(".halftone-customizer summary");
  await customize.click();
  const panel = page.getByRole("group", { name: "Make it your own." });
  await panel.getByLabel("Preset", { exact: true }).selectOption("mobius");
  await expect(panel.getByLabel("Mode", { exact: true })).toHaveValue("mesh");
  await expect(panel.getByLabel("Shape", { exact: true })).toHaveValue(
    "square",
  );
  await expect(panel.getByLabel("Accent", { exact: true })).toHaveValue(
    "#1e4ed8",
  );
  await expect(panel.getByLabel("Paper", { exact: true })).toHaveValue(
    "#ffffff",
  );
  await expect(
    panel.getByRole("switch", { name: "Scan motion", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(3000);
  const mesh = await canvas.screenshot();
  expect(mesh.equals(newsprint)).toBe(false);
  const colourStats = await page.evaluate(
    async (dataURL) => {
      const image = new Image();
      image.src = dataURL;
      await image.decode();
      const surface = document.createElement("canvas");
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        surface.width,
        surface.height,
      ).data;
      const colours = new Set<string>();
      let invalidPixels = 0;
      for (let y = 2; y < surface.height - 2; y++) {
        for (let x = 2; x < surface.width - 2; x++) {
          const i = (y * surface.width + x) * 4;
          colours.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
          const opacity = (255 - pixels[i]) / (255 - 30);
          const expectedGreen = 255 - (255 - 78) * opacity;
          const expectedBlue = 255 - (255 - 216) * opacity;
          if (
            Math.abs(pixels[i + 1] - expectedGreen) > 2 ||
            Math.abs(pixels[i + 2] - expectedBlue) > 2
          )
            invalidPixels++;
        }
      }
      return { colours: colours.size, invalidPixels };
    },
    `data:image/png;base64,${mesh.toString("base64")}`,
  );
  expect(colourStats.colours).toBeGreaterThan(2);
  expect(colourStats.invalidPixels).toBe(0);
  await page.waitForTimeout(200);
  expect((await canvas.screenshot()).equals(mesh)).toBe(true);
  const bounds = (await stage.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.3,
  );
  await page.waitForTimeout(250);
  expect((await canvas.screenshot()).equals(mesh)).toBe(false);
  await customize.click();
  await panel.getByLabel("Preset", { exact: true }).selectOption("newsprint");
  await expect(panel.getByLabel("Mode", { exact: true })).toHaveValue("mono");
  await expect(
    panel.getByRole("slider", { name: "Cell size", exact: true }),
  ).toHaveValue("6");
  expect(errors).toEqual([]);
});

test("source darkness changes line opacity while the regular grid stays straight", async ({
  page,
}) => {
  await page.route("**/images/hero-halftone.png", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect x="10" y="10" width="40" height="80" fill="#202020"/><rect x="50" y="10" width="40" height="80" fill="#e0e0e0"/></svg>',
    }),
  );
  await page.goto("/");
  await expect(page.locator(".halftone-reveal")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.locator(".halftone-customizer summary").click();
  await page.getByLabel("Preset", { exact: true }).selectOption("mobius");
  await page.keyboard.press("Escape");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(3000);
  const screenshot = await page.locator(".halftone-reveal canvas").screenshot();
  const profiles = await page.evaluate(
    async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const side = canvas.width;
      const top = (canvas.height - side) / 2;
      return [0.3, 0.5, 0.7].map((fraction) => {
        const y = Math.round(
          top + (Math.floor((side * fraction) / 10) + 0.5) * 10,
        );
        const peaks: number[] = [];
        let dark = 0;
        let light = 0;
        const start = Math.ceil(side * 0.2);
        const end = Math.floor(side * 0.4);
        for (let x = start; x < end; x++) {
          const opacity = (255 - pixels[(y * side + x) * 4]) / 225;
          if (opacity > 0.15) peaks.push(x);
          dark += opacity;
          const lightX = x + Math.round(side * 0.4);
          light += (255 - pixels[(y * side + lightX) * 4]) / 225;
        }
        return { peaks, dark, light };
      });
    },
    `data:image/png;base64,${screenshot.toString("base64")}`,
  );
  expect(profiles[0].peaks.length).toBeGreaterThan(5);
  expect(profiles[1].peaks).toEqual(profiles[0].peaks);
  expect(profiles[2].peaks).toEqual(profiles[0].peaks);
  for (const profile of profiles)
    expect(profile.dark).toBeGreaterThan(profile.light * 2);
});

test("the mobile configuration panel stays in the image, scrolls, and closes with Done", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const customize = page.locator(".halftone-customizer summary");
  await customize.click();
  const panel = page.getByRole("group", { name: "Make it your own." });
  await expect(panel).toBeVisible();
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await panel.getByRole("button", { name: "Done", exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(customize).toBeFocused();
});
