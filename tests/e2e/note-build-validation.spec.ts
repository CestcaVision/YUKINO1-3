import { execSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { stripAnsi } from "./helpers";

const noteContentDirectory = "./tests/fixtures/notes";
const workContentDirectory = "./tests/fixtures/works";
const notesDirectory = join(process.cwd(), noteContentDirectory);

function buildFixtures() {
  return execSync("pnpm build", {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      NOTE_CONTENT_DIRECTORY: noteContentDirectory,
      WORK_CONTENT_DIRECTORY: workContentDirectory,
    },
    stdio: "pipe",
  });
}

function expectBuildFailure(filename: string, content: string, expectedMessage: RegExp) {
  const fixturePath = join(notesDirectory, filename);
  writeFileSync(fixturePath, content, "utf8");

  try {
    buildFixtures();
    throw new Error("Expected build to fail");
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message: string };
    const output = stripAnsi(`${failure.stdout ?? ""}\n${failure.stderr ?? ""}\n${failure.message}`);
    expect(output).toMatch(expectedMessage);
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

test.describe.configure({ mode: "serial" });

test("unknown controlled metadata fails with the offending value", () => {
  expectBuildFailure(
    "invalid-subject.md",
    `---
title: Invalid subject
summary: Validation fixture.
slug: invalid-subject
date: 2026-09-05
lifecycle: published
subject: Astrology
media: [Written explanation]
capabilities: [Explains a mathematical idea]
---
Body.
`,
    /subject: Invalid option: expected one of/,
  );
});

test("missing required metadata fails with the missing field", () => {
  expectBuildFailure(
    "missing-summary.md",
    `---
title: Missing summary
slug: missing-summary
date: 2026-09-05
lifecycle: published
subject: Mathematics
media: [Written explanation]
capabilities: [Explains a mathematical idea]
---
Body.
`,
    /summary/,
  );
});

test("duplicate stable slugs fail with actionable file details", () => {
  expectBuildFailure(
    "duplicate-slug.md",
    `---
title: A renamed Note keeps its address
summary: Validation fixture.
slug: completing-the-square
date: 2026-09-05
lifecycle: draft
subject: Mathematics
media: [Written explanation]
capabilities: [Explains a mathematical idea]
---
Body.
`,
    /Duplicate Note slug "completing-the-square".*duplicate-slug/s,
  );
});

test("HTML embeds fail with safe-content guidance", () => {
  expectBuildFailure(
    "unsafe-embed.md",
    `---
title: Unsafe embed
summary: Validation fixture.
slug: unsafe-embed
date: 2026-09-05
lifecycle: published
subject: Mathematics
media: [Written explanation]
capabilities: [Explains a mathematical idea]
---
<script>alert("unsafe")</script>
`,
    /Unsafe executable or embedded markup.*Use Markdown, fenced code, math/s,
  );
});

test("MDX files fail instead of entering or bypassing the collection", () => {
  expectBuildFailure(
    "executable-note.mdx",
    "export const Component = () => <button>Run me</button>;",
    /Unsupported executable Note file "executable-note.mdx".*MDX, Astro, and React content are not allowed/s,
  );
});

test("changing a title preserves the explicit stable slug in browser output", async ({ page }) => {
  const notePath = join(notesDirectory, "completing-the-square.md");
  const originalNote = readFileSync(notePath, "utf8");
  const renamedTitle = "A new title for the same Note";

  try {
    writeFileSync(
      notePath,
      originalNote.replace("title: Completing the square, visually", `title: ${renamedTitle}`),
      "utf8",
    );
    buildFixtures();

    await page.goto("/notes/completing-the-square/");
    await expect(page.getByRole("heading", { level: 1, name: renamedTitle })).toBeVisible();
    await expect(page).toHaveURL(/\/notes\/completing-the-square\/$/);
  } finally {
    writeFileSync(notePath, originalNote, "utf8");
    buildFixtures();
  }
});
