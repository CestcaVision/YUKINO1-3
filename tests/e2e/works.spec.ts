import { expect, test } from "@playwright/test";

test("a published Work appears in the index and as a complete Case Study", async ({
  page,
}) => {
  await page.goto("/works/");

  const workLink = page
    .locator(".work-category")
    .getByRole("link", { name: "Sorting algorithm visualiser" });
  await expect(workLink).toHaveAttribute(
    "href",
    "/works/fixture-sorting-algorithm-visualiser/",
  );
  await expect(
    page.getByText("Interactive systems", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Visual explanations", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/coming soon/i)).toHaveCount(0);

  await workLink.click();
  await expect(page).toHaveURL(/\/works\/fixture-sorting-algorithm-visualiser\/$/);
  for (const heading of [
    "Problem",
    "Hypothesis",
    "Process",
    "Key decisions",
    "Outcome",
    "Validation",
    "Limitations",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading }),
    ).toBeVisible();
  }
  await expect(page.getByText(/I designed the comparison/)).toBeVisible();
  await expect(page.getByText("Step 0 of 10", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByText("Comparing positions 1 and 2", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Algorithm" }).selectOption("insertion");
  await expect(page.getByText("Step 0 of 7", { exact: true })).toBeVisible();
});

test("Capabilities appear only with links to published evidence", async ({
  page,
}) => {
  await page.goto("/works/");

  const capability = page.getByRole("heading", {
    level: 3,
    name: "Builds a computational model",
  });
  await expect(capability).toBeVisible();
  await expect(
    capability
      .locator("..")
      .getByRole("link", { name: "Sorting algorithm visualiser", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Interprets evidence", { exact: true }),
  ).toHaveCount(0);
});

test("draft and review Works have no production surface", async ({
  page,
  request,
}) => {
  await page.goto("/works/");

  await expect(page.getByText("Hidden draft Work")).toHaveCount(0);
  await expect(page.getByText("Hidden review Work")).toHaveCount(0);
  expect((await request.get("/works/hidden-draft/")).status()).toBe(404);
  expect((await request.get("/works/hidden-review/")).status()).toBe(404);
});
