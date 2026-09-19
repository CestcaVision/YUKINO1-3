import { execSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { stripAnsi } from "./helpers";

const workContentDirectory = "./tests/fixtures/works";
const worksDirectory = join(process.cwd(), workContentDirectory);

function expectBuildFailure(
  filename: string,
  content: string,
  expectedMessage: RegExp,
) {
  const fixturePath = join(worksDirectory, filename);
  writeFileSync(fixturePath, content, "utf8");

  try {
    execSync("pnpm build", {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, WORK_CONTENT_DIRECTORY: workContentDirectory },
      stdio: "pipe",
    });
    throw new Error("Expected build to fail");
  } catch (error) {
    const failure = error as {
      stdout?: string;
      stderr?: string;
      message: string;
    };
    const output = stripAnsi(
      `${failure.stdout ?? ""}\n${failure.stderr ?? ""}\n${failure.message}`,
    );
    expect(output).toMatch(expectedMessage);
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

test.describe.configure({ mode: "serial" });

test("Work metadata rejects an unknown controlled value", () => {
  expectBuildFailure(
    "invalid-medium.md",
    `---
title: Invalid Work
summary: Validation fixture.
slug: invalid-work
date: 2026-09-05
lifecycle: published
subject: Computer Science
category: Interactive systems
media: [Oil painting]
capabilities: [Builds a computational model]
contribution: I built it.
evidence:
  problem: A problem.
  hypothesis: A hypothesis.
  process: A process.
  decisions: A decision.
  outcome: An outcome.
  validation: Validation.
  limitations: Limitations.
---
Body.
`,
    /media.*Invalid option: expected one of/s,
  );
});

test("Work metadata rejects an interaction outside the allowlist", () => {
  expectBuildFailure(
    "unsafe-interaction.md",
    `---
title: Unsafe interaction
summary: Validation fixture.
slug: unsafe-interaction
date: 2026-09-05
lifecycle: published
subject: Computer Science
category: Interactive systems
media: [Web experience]
capabilities: [Builds a computational model]
contribution: I built it.
interaction: ../../AuthorComponent
evidence:
  problem: A problem.
  hypothesis: A hypothesis.
  process: A process.
  decisions: A decision.
  outcome: An outcome.
  validation: Validation.
  limitations: Limitations.
---
Body.
`,
    /interaction.*Invalid option/s,
  );
});
