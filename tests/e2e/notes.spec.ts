import { expect, test } from "@playwright/test";

test("a published Note appears in the index and at its stable address", async ({
  page,
}) => {
  await page.goto("/notes/");

  const noteLink = page.getByRole("link", {
    name: "Completing the square, visually",
  });
  await expect(noteLink).toHaveAttribute(
    "href",
    "/notes/completing-the-square/",
  );
  await expect(
    page.getByText(
      "A geometric route from a quadratic expression to vertex form.",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".note-list").getByText("Mathematics", { exact: true }),
  ).toBeVisible();

  await noteLink.click();
  await expect(page).toHaveURL(/\/notes\/completing-the-square\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Completing the square, visually",
    }),
  ).toBeVisible();
  await expect(page.locator("pre code")).toContainText("vertexX");
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(
    page.getByText("Explains a mathematical idea", { exact: true }),
  ).toBeVisible();
});

test("draft and review Notes have no production surface", async ({
  page,
  request,
}) => {
  await page.goto("/notes/");

  await expect(page.getByText("Hidden draft Note")).toHaveCount(0);
  await expect(page.getByText("Hidden review Note")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Preview drafts" })).toHaveCount(
    0,
  );
  expect((await request.get("/notes/drafts/")).status()).toBe(404);
  expect((await request.get("/notes/hidden-draft/")).status()).toBe(404);
  expect((await request.get("/notes/hidden-review/")).status()).toBe(404);
});
