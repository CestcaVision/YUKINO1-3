import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const orbitScene = "[data-trace-scene]";

test("Bézier controls reshape the ribbon with drag and keyboard, then reset precisely", async ({
  page,
}) => {
  await page.goto("/");
  const study = page.locator("bezier-study");
  const curve = study.locator(".bezier-main");
  const initial = await curve.getAttribute("d");
  const content = await page
    .locator(".notebook-section .home-evidence")
    .innerText();
  const handle = study.getByRole("button", {
    name: "First control point",
    exact: true,
  });
  await handle.hover();
  const box = await handle.boundingBox();
  await page.mouse.move(box!.x + 22, box!.y + 22);
  await page.mouse.down();
  await page.mouse.move(box!.x + 22 - 60, box!.y + 22 + 70, { steps: 5 });
  await page.mouse.up();
  await expect(curve).not.toHaveAttribute("d", initial!);
  await expect(handle).toBeFocused();
  const dragged = await curve.getAttribute("d");
  await page.keyboard.press("ArrowRight");
  await expect(curve).not.toHaveAttribute("d", dragged!);
  await page.keyboard.press("Home");
  await expect(curve).toHaveAttribute("d", initial!);
  await page.getByRole("checkbox", { name: "Show construction" }).check();
  await page.getByRole("slider", { name: "Bézier trace position" }).fill("780");
  await study.getByRole("button", { name: "Reset Bézier curve" }).click();
  await expect(curve).toHaveAttribute("d", initial!);
  await expect(study).toHaveAttribute("data-parameter", "0.420");
  await expect(
    page.getByRole("checkbox", { name: "Show construction" }),
  ).not.toBeChecked();
  expect(
    await page.locator(".notebook-section .home-evidence").innerText(),
  ).toBe(content);
});

test("de Casteljau construction traces the exact point on the cubic curve", async ({
  page,
}) => {
  await page.goto("/");
  const study = page.locator("bezier-study");
  await page.getByRole("checkbox", { name: "Show construction" }).check();
  await page.getByRole("slider", { name: "Bézier trace position" }).fill("500");
  await expect(study).toHaveAttribute("data-parameter", "0.500");
  await expect(study.locator("[data-construction]")).toBeVisible();
  expect(await study.locator("[data-first-point]").count()).toBe(3);
  expect(await study.locator("[data-second-point]").count()).toBe(2);
  const position = await study.evaluate((el) => {
    const controls = [...el.querySelectorAll("[data-control-circle]")].map(
      (point) => [
        Number(point.getAttribute("cx")),
        Number(point.getAttribute("cy")),
      ],
    );
    const sample = el.querySelector(".bezier-sample")!;
    return {
      actual: [
        Number(sample.getAttribute("cx")),
        Number(sample.getAttribute("cy")),
      ],
      expected: [0, 1].map(
        (axis) =>
          (controls[0][axis] +
            3 * controls[1][axis] +
            3 * controls[2][axis] +
            controls[3][axis]) /
          8,
      ),
    };
  });
  position.actual.forEach((coordinate, index) =>
    expect(coordinate).toBeCloseTo(position.expected[index], 3),
  );
  await page.getByRole("slider", { name: "Bézier trace position" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(study).toHaveAttribute("data-parameter", "0.501");
});

test("Bézier playback updates the sample while leaving all background curves fixed", async ({
  page,
}) => {
  await page.goto("/");
  const study = page.locator("bezier-study");
  const background = await study
    .locator(".bezier-ribbon")
    .evaluateAll((lines) => lines.map((line) => line.getAttribute("d")));
  await study.getByRole("button", { name: "Play Bézier trace" }).click();
  const initial = await study.getAttribute("data-parameter");
  await expect(study).not.toHaveAttribute("data-parameter", initial!);
  expect(
    await study
      .locator(".bezier-ribbon")
      .evaluateAll((lines) => lines.map((line) => line.getAttribute("d"))),
  ).toEqual(background);
  await study.getByRole("button", { name: "Pause Bézier trace" }).click();
  const paused = await study.getAttribute("data-parameter");
  await page.waitForTimeout(150);
  await expect(study).toHaveAttribute("data-parameter", paused!);
  await study.getByRole("button", { name: "Play Bézier trace" }).click();
  await page
    .locator(".hero")
    .evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(80);
  const offscreen = await study.getAttribute("data-parameter");
  await page.waitForTimeout(150);
  await expect(study).toHaveAttribute("data-parameter", offscreen!);
});

test("Lorenz trace plays, pauses and suspends its animation outside the viewport", async ({
  page,
}) => {
  await page.goto("/");
  const trace = page.locator("lorenz-trace");
  await page.getByRole("button", { name: "Play trace", exact: true }).click();
  await expect(trace).toHaveAttribute("data-playing", "true");
  const first = await trace.getAttribute("data-position");
  await expect(trace).not.toHaveAttribute("data-position", first!);
  await page.getByRole("button", { name: "Pause trace", exact: true }).click();
  const paused = await trace.getAttribute("data-position");
  await page.waitForTimeout(150);
  await expect(trace).toHaveAttribute("data-position", paused!);
  await page.getByRole("button", { name: "Play trace", exact: true }).click();
  await page
    .locator(".hero")
    .evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(80);
  const offscreen = await trace.getAttribute("data-position");
  await page.waitForTimeout(150);
  await expect(trace).toHaveAttribute("data-position", offscreen!);
  await page.locator(orbitScene).scrollIntoViewIfNeeded();
  await expect(trace).not.toHaveAttribute("data-position", offscreen!);
});

test("the trajectory scrubs and rotates without recomputing the orbit during playback", async ({
  page,
}) => {
  await page.goto("/");
  const slider = page.getByRole("slider", {
    name: "Trace position",
    exact: true,
  });
  const trace = page.locator("lorenz-trace");
  await slider.fill("2500");
  await expect(trace).toHaveAttribute("data-position", "2500");
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(trace).toHaveAttribute("data-position", "2499");
  const orbit = trace.locator(".trace-orbit").first();
  const initial = await orbit.getAttribute("d");
  await page.locator(orbitScene).focus();
  await page.keyboard.press("ArrowRight");
  await expect(orbit).not.toHaveAttribute("d", initial!);
  await page.keyboard.press("Home");
  await expect(orbit).toHaveAttribute("d", initial!);
  await page.getByRole("button", { name: "Play trace", exact: true }).click();
  await expect(trace).not.toHaveAttribute("data-position", "2499");
  await expect(orbit).toHaveAttribute("d", initial!);
});

test("orbit bookmarks trace real updates through hover, keyboard focus and activation", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Lately" });
  const entries = section.locator("[data-activity-entry]");
  const buttons = section.locator("[data-trace-node]");
  expect(await buttons.count()).toBe(Math.min(4, await entries.count()));
  await entries.nth(1).hover();
  await expect(section.locator('[data-marker="1"]')).toHaveAttribute(
    "data-active",
    "",
  );
  await expect(entries.nth(1)).toHaveAttribute("data-trace-active", "");
  await buttons.nth(0).focus();
  await expect(section.locator('[data-marker="0"]')).toHaveAttribute(
    "data-active",
    "",
  );
  await buttons.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(entries.nth(1)).toBeFocused();
  await expect(entries.nth(1)).toBeInViewport();
  const link = entries.nth(1).getByRole("link");
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(href!);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reduced motion disables autoplay and preserves manual curve editing and scrubbing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play Bézier trace" }),
  ).toBeDisabled();
  await page.getByRole("slider", { name: "Bézier trace position" }).fill("760");
  await expect(page.locator("bezier-study")).toHaveAttribute(
    "data-parameter",
    "0.760",
  );
  await expect(
    page.getByRole("button", { name: "Play trace", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("slider", { name: "Trace position", exact: true })
    .fill("1900");
  await expect(page.locator("lorenz-trace")).toHaveAttribute(
    "data-position",
    "1900",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Play trace", exact: true }).click();
  await expect(page.locator("lorenz-trace")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("lorenz-trace")).toHaveAttribute(
    "data-playing",
    "false",
  );
});

test("mathematical artwork has no new console errors or WCAG AA violations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.location().url.endsWith("/favicon.ico")) return;
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page.getByRole("checkbox", { name: "Show construction" }).check();
  await page.locator("[data-trace-node]").last().focus();
  const results = await new AxeBuilder({ page })
    .include(".notebook-section")
    .include(".activity-section")
    .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(errors).toEqual([]);
});

for (const width of [320, 390]) {
  test(`artwork supports touch and vertical scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.getByRole("checkbox", { name: "Show construction" }).check();
    await expect(
      page.locator("bezier-study [data-construction]"),
    ).toBeVisible();
    const button = page.locator("[data-trace-node]").last();
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await button.click();
    await expect(
      page
        .locator("[data-activity-entry]")
        .nth((await page.locator("[data-trace-node]").count()) - 1),
    ).toBeFocused();
    expect(
      await page
        .locator("[data-bezier-scene]")
        .evaluate((el) => getComputedStyle(el).touchAction),
    ).toBe("pan-y");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}

test.describe("touch Bézier editing", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("touch dragging moves a point while the rest of the artwork permits page scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const study = page.locator("bezier-study");
    const handle = study.getByRole("button", {
      name: "First control point",
      exact: true,
    });
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox();
    const before = await page.evaluate(() => scrollY);
    const original = await study.locator(".bezier-main").getAttribute("d");
    const cdp = await page.context().newCDPSession(page);
    const x = box!.x + 22,
      y = box!.y + 22;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (const delta of [10, 20, 30, 40]) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - delta, y: y + delta }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(study.locator(".bezier-main")).not.toHaveAttribute(
      "d",
      original!,
    );
    expect(await page.evaluate(() => scrollY)).toBe(before);
    const svg = study.locator("[data-bezier-scene]");
    await svg.scrollIntoViewIfNeeded();
    const scene = await svg.boundingBox();
    const start = await page.evaluate(() => scrollY);
    const scrollX = scene!.x + scene!.width * 0.9;
    const scrollY = scene!.y + scene!.height * 0.5;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: scrollX, y: scrollY }],
    });
    for (const delta of [30, 60, 90, 120]) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: scrollX, y: scrollY - delta }],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(start + 20);
    await cdp.detach();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("both mathematical shapes and all evidence render statically", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("bezier-study").getByRole("img")).toBeVisible();
    await expect(page.locator("lorenz-trace").getByRole("img")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Play Bézier trace" }),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: "Play trace" })).toBeHidden();
    await expect(
      page.getByRole("slider", { name: "Trace position", exact: true }),
    ).toBeHidden();
    await expect(page.locator("[data-trace-node]").first()).toBeHidden();
    await expect(page.locator("[data-bezier-scene]")).not.toHaveAttribute(
      "tabindex",
    );
    await expect(
      page.getByRole("link", { name: "Read all notes" }),
    ).toBeVisible();
    await page.locator(".activity-list a").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
