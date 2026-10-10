import { expect, test } from "@playwright/test";

const surfaceLabel = /Interactive Möbius strip/;

test("the surface rotates, pauses, and responds to dragging and the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const surface = page.getByRole("img", { name: surfaceLabel });
  const edge = surface.locator(".surface-edge");
  await expect(
    page.getByRole("button", { name: "Pause animation" }),
  ).toBeVisible();
  const face = surface.locator('[data-face="123"]');
  const initialColour = await face.getAttribute("fill");
  const initial = await edge.getAttribute("d");
  await expect.poll(() => edge.getAttribute("d")).not.toBe(initial);
  await expect.poll(() => face.getAttribute("fill")).not.toBe(initialColour);
  await page.getByRole("button", { name: "Pause animation" }).click();
  await expect(
    page.getByRole("button", { name: "Play animation" }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const paused = await edge.getAttribute("d");
  const pausedColour = await face.getAttribute("fill");
  await page.waitForTimeout(150);
  expect(await edge.getAttribute("d")).toBe(paused);
  expect(await face.getAttribute("fill")).toBe(pausedColour);
  const bounds = (await surface.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.7,
    bounds.y + bounds.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect.poll(() => edge.getAttribute("d")).not.toBe(paused);
  const dragged = await edge.getAttribute("d");
  await surface.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => edge.getAttribute("d")).not.toBe(dragged);
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect(
    page.getByRole("button", { name: "Pause animation" }),
  ).toBeVisible();
});

test("reduced motion keeps the surface still while allowing deliberate rotation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Motion off" })).toBeDisabled();
  const surface = page.getByRole("img", { name: surfaceLabel });
  const edge = surface.locator(".surface-edge");
  const face = surface.locator('[data-face="123"]');
  const initialColour = await face.getAttribute("fill");
  const initial = await edge.getAttribute("d");
  await page.waitForTimeout(150);
  expect(await edge.getAttribute("d")).toBe(initial);
  expect(await face.getAttribute("fill")).toBe(initialColour);
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => edge.getAttribute("d")).not.toBe(initial);
  await page.keyboard.press("Home");
  await expect.poll(() => edge.getAttribute("d")).toBe(initial);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("a static surface remains visible without unusable animation controls", async ({
    page,
  }) => {
    await page.goto("/");
    const surface = page.getByRole("img", { name: surfaceLabel });
    await expect(surface).toBeVisible();
    await expect(surface.locator(".surface-face")).toHaveCount(448);
    await expect(surface.locator('[data-face="123"]')).toHaveAttribute(
      "fill",
      /^rgb/,
    );
    await expect(surface.locator(".surface-edge")).toHaveAttribute(
      "d",
      /^M.+L/,
    );
    await expect(
      page.getByRole("button", { name: "Pause animation" }),
    ).toBeHidden();
  });
});
