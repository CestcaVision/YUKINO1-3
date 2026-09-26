import { expect, test } from "@playwright/test";

const routes = [
  {
    name: "home",
    path: "/",
    heading: "Exploring ideas through mathematics and computation.",
  },
  { name: "works", path: "/works/", heading: "Works" },
  { name: "notes", path: "/notes/", heading: "Notes" },
  { name: "about", path: "/about/", heading: "About" },
];

for (const route of routes) {
  test(`${route.name} page is a readable, non-indexable preview`, async ({
    page,
  }) => {
    const consoleProblems: string[] = [];
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });

    await page.goto(route.path);

    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    expect(consoleProblems).toEqual([]);
  });
}

test("an unknown route renders the custom 404 page", async ({ page }) => {
  const response = await page.goto("/missing-page/");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("the compact mobile menu exposes the primary destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole("link", { name: "Works" }).click();

  await expect(page).toHaveURL(/\/works\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Works" }),
  ).toBeVisible();
});

test.describe("without client-side JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("core pages remain readable and navigable", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Exploring ideas through mathematics and computation.",
      }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "About" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "About" }),
    ).toBeVisible();
  });
});
