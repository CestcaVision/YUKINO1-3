import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const noteDirectory = mkdtempSync(join(tmpdir(), "generated-note-preview-"));
const metadata = {
  title: "Fixture AI explanation",
  summary: "A generated explanation used only for testing.",
  slug: "issue-42",
  date: "2026-10-10",
  lifecycle: "published",
  subject: "Mathematics",
  media: ["Written explanation"],
  capabilities: ["Interprets evidence"],
  authorship: "ai-generated",
  sourceIssue: "https://github.com/fixture/site/issues/42",
  sourceHash: "a".repeat(64),
  generationModel: "fixture-mimo",
};
function build(directory: string) {
  const result = spawnSync("pnpm", ["exec", "astro", "build"], {
    encoding: "utf8",
    env: {
      ...process.env,
      NOTE_CONTENT_DIRECTORY: directory,
      WORK_CONTENT_DIRECTORY: "./tests/fixtures/works",
    },
  });
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.beforeAll(() => {
  cpSync("tests/fixtures/notes", noteDirectory, { recursive: true });
  writeFileSync(
    join(noteDirectory, "issue-42.md"),
    `---\n${JSON.stringify(metadata)}\n---\n\n## A worked example\n\nThe equality $x^2 + 2x + 1 = (x+1)^2$ shows completing the square.\n\n$$a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p=q$$\n`,
  );
  build(noteDirectory);
});
test.afterAll(() => {
  try {
    build("./tests/fixtures/notes");
  } finally {
    rmSync(noteDirectory, { recursive: true, force: true });
  }
});

test("generated notes are discoverable and clearly attributed to their Issue and model", async ({
  page,
  request,
}) => {
  await page.goto("/notes/");
  const card = page
    .locator("li[data-evidence-item]")
    .filter({ hasText: metadata.title });
  await expect(card).toContainText("AI-generated");
  await card.getByRole("link", { name: metadata.title }).click();
  await expect(page).toHaveURL(/\/notes\/issue-42\/$/);
  const attribution = page.getByRole("complementary", {
    name: "Note authorship",
  });
  await expect(attribution).toContainText("AI-generated note");
  await expect(attribution).toContainText("fixture-mimo");
  await expect(
    attribution.getByRole("link", { name: "Read the original Issue" }),
  ).toHaveAttribute("href", metadata.sourceIssue);
  await expect(page.locator(".katex").first()).toBeVisible();
  await page.goto("/");
  await expect(
    page
      .getByRole("region", { name: "From my notebook" })
      .getByRole("link", { name: metadata.title }),
  ).toBeVisible();
  expect(await (await request.get("/rss.xml")).text()).toContain(
    metadata.title,
  );
});

test("generated explanations do not become evidence of the student's independent capabilities", async ({
  page,
}) => {
  await page.goto("/works/");
  await expect(
    page
      .getByRole("region", { name: "Capabilities" })
      .getByRole("link", { name: metadata.title }),
  ).toHaveCount(0);
});

test("long generated formulas scroll within the note on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/notes/issue-42/");
  const formula = page.locator(".katex-display");
  await expect(formula).toBeVisible();
  expect(
    await formula.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
