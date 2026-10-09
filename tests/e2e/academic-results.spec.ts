import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const contentDirectory = mkdtempSync(join(tmpdir(), "academic-results-"));
const achievedResult = {
  qualification: "Fixture A Level",
  subject: "Mathematics",
  result: "A*",
  status: "achieved",
  awardingBody: "Fixture Examination Board",
  examinationSession: "June 2026",
  evidenceChecked: true,
  effectiveDate: "2026-08-13",
  public: true,
};

function buildResults(records: Record<string, unknown>[]) {
  records.forEach((record, index) => {
    writeFileSync(
      join(contentDirectory, `${index}.md`),
      `---\n${JSON.stringify(record)}\n---\n`,
    );
  });
  const build = spawnSync("pnpm exec astro build", {
    shell: true,
    encoding: "utf8",
    env: {
      ...process.env,
      NOTE_CONTENT_DIRECTORY: "./tests/fixtures/notes",
      WORK_CONTENT_DIRECTORY: "./tests/fixtures/works",
      ACADEMIC_RESULT_CONTENT_DIRECTORY: contentDirectory,
    },
  });
  records.forEach((_, index) => rmSync(join(contentDirectory, `${index}.md`)));
  return { status: build.status, output: `${build.stdout}\n${build.stderr}` };
}

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ javaScriptEnabled: false });

test.afterAll(() => {
  try {
    const build = buildResults([]);
    expect(build.status, build.output).toBe(0);
  } finally {
    rmSync(contentDirectory, { recursive: true, force: true });
  }
});

test("Academic Result rejects missing required metadata", () => {
  const build = buildResults([{}]);
  expect(build.status, build.output).not.toBe(0);
  for (const field of [
    "qualification",
    "result",
    "status",
    "awardingBody",
    "examinationSession",
    "evidenceChecked",
    "effectiveDate",
    "public",
  ]) {
    expect(build.output).toContain(field);
  }
});

test("readers see verified public results with explicit achieved and predicted labels", async ({
  page,
}) => {
  const build = buildResults([
    achievedResult,
    {
      ...achievedResult,
      qualification: "Fixture Overall Diploma",
      subject: undefined,
      result: "40/45",
      status: "predicted",
      effectiveDate: "2026-09-01",
    },
    {
      ...achievedResult,
      qualification: "Private qualification",
      public: false,
    },
    {
      ...achievedResult,
      qualification: "Unchecked qualification",
      evidenceChecked: false,
    },
  ]);
  expect(build.status, build.output).toBe(0);

  for (const route of ["/", "/about/"]) {
    await page.goto(route);
    if (route === "/") {
      await expect(
        page.getByRole("region", { name: "Academic Snapshot" }),
      ).toHaveCount(0);
      await expect(page.getByText("Fixture Overall Diploma")).toHaveCount(0);
      continue;
    }
    const section = page.getByRole("region", { name: "Academic Results" });
    await expect(section.getByRole("listitem")).toHaveCount(2);
    await expect(
      section.getByText("Achieved: A*", { exact: true }),
    ).toBeVisible();
    await expect(
      section.getByText("Officially predicted: 40/45", { exact: true }),
    ).toBeVisible();
    await expect(section).toContainText("Fixture Examination Board");
    await expect(section).toContainText("June 2026");
    await expect(section.locator("time").first()).toHaveAttribute(
      "datetime",
      "2026-09-01",
    );
    await expect(section.getByRole("listitem").first()).toContainText(
      "Fixture Overall Diploma",
    );
    await expect(page.getByText("Private qualification")).toHaveCount(0);
    await expect(page.getByText("Unchecked qualification")).toHaveCount(0);
    await expect(section).not.toContainText(/undefined|null|Pending/);
  }
});

test("without eligible results About explains the absence and Home omits the Snapshot", async ({
  page,
}) => {
  const initialBuild = buildResults([achievedResult]);
  expect(initialBuild.status, initialBuild.output).toBe(0);
  for (const records of [
    [],
    [{ ...achievedResult, public: false }],
    [{ ...achievedResult, evidenceChecked: false }],
  ]) {
    const build = buildResults(records);
    expect(build.status, build.output).toBe(0);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Academic Snapshot" }),
    ).toHaveCount(0);
    await page.goto("/about/");
    const results = page.getByRole("region", { name: "Academic Results" });
    await expect(results).toContainText(
      "No verified Academic Results are published yet.",
    );
    await expect(results.getByRole("listitem")).toHaveCount(0);
    await expect(results).not.toContainText(/Pending|A\*/);
  }
});

test("current study appears separately and never creates an Academic Result", async ({
  page,
}) => {
  const studyPath = join(process.cwd(), "src/data/current-study.json");
  const original = readFileSync(studyPath, "utf8");
  try {
    writeFileSync(studyPath, JSON.stringify(["Fixture studying Physics"]));
    const build = buildResults([]);
    expect(build.status, build.output).toBe(0);
    await page.goto("/about/");
    const study = page.getByRole("region", { name: "Current study" });
    await expect(study).toContainText("Fixture studying Physics");
    await expect(study).toContainText(
      "These are current studies, not examination results or official predictions.",
    );
    const results = page.getByRole("region", { name: "Academic Results" });
    await expect(results).not.toContainText("Fixture studying Physics");
    await expect(results.getByRole("listitem")).toHaveCount(0);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Academic Snapshot" }),
    ).toHaveCount(0);
  } finally {
    writeFileSync(studyPath, original);
  }
});

test("a Pending score cannot become a published Academic Result", () => {
  const build = buildResults([{ ...achievedResult, result: "Pending" }]);
  expect(build.status, build.output).not.toBe(0);
  expect(build.output).toContain("result");
});

test("Academic Result rejects blank fields, unofficial status, invalid dates and non-boolean permissions", () => {
  const build = buildResults([
    {
      qualification: " ",
      subject: " ",
      result: " ",
      status: "estimated",
      awardingBody: " ",
      examinationSession: " ",
      evidenceChecked: "true",
      effectiveDate: "2026-02-30",
      public: "true",
    },
  ]);
  expect(build.status, build.output).not.toBe(0);
  for (const field of [
    "qualification",
    "subject",
    "result",
    "status",
    "awardingBody",
    "examinationSession",
    "evidenceChecked",
    "effectiveDate",
    "public",
  ]) {
    expect(build.output).toContain(field);
  }
});

test("Home keeps results on About on desktop and mobile without JavaScript", async ({
  page,
}) => {
  const build = buildResults([
    {
      ...achievedResult,
      qualification: "Oldest qualification",
      effectiveDate: "2024-08-15",
    },
    {
      ...achievedResult,
      qualification: "Second qualification",
      effectiveDate: "2025-08-14",
    },
    achievedResult,
    {
      ...achievedResult,
      qualification: "Newest qualification",
      result: "A",
      status: "predicted",
      effectiveDate: "2026-09-01",
    },
  ]);
  expect(build.status, build.output).toBe(0);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type()))
      errors.push(message.text());
  });
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page).toHaveTitle("Yukino — Learning & making");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const snapshot = page.getByRole("region", { name: "Academic Snapshot" });
    await expect(snapshot).toHaveCount(0);
    await expect(page.getByText("Newest qualification")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: join(tmpdir(), `issue-4-home-${viewport.width}.png`),
      fullPage: true,
    });
    if (viewport.width === 375)
      await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page
      .getByRole("navigation", {
        name: viewport.width === 375 ? "Mobile" : "Primary",
        exact: true,
      })
      .getByRole("link", { name: "About", exact: true })
      .click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page).toHaveTitle(/About/);
    const results = page.getByRole("region", { name: "Academic Results" });
    await expect(results.getByRole("listitem")).toHaveCount(4);
    await expect(results).toContainText("Oldest qualification");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: join(tmpdir(), `issue-4-about-${viewport.width}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
