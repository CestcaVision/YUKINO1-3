import { describe, expect, it } from "vitest";
import { sitePath } from "../../src/site-path";

describe("deployment route prefixes", () => {
  it("preserves routes on the student's root site", () => {
    expect(sitePath("/notes/issue-42/", "/")).toBe("/notes/issue-42/");
  });
  it("prefixes navigation and fragments on a fork's project site", () => {
    expect(sitePath("/", "/YUKINO1-3.github.io/")).toBe(
      "/YUKINO1-3.github.io/",
    );
    expect(sitePath("/about/#academic-results", "/YUKINO1-3.github.io")).toBe(
      "/YUKINO1-3.github.io/about/#academic-results",
    );
  });
  it("does not rewrite external links or in-page anchors", () => {
    expect(sitePath("https://github.com/owner/site/issues/42", "/fork/")).toBe(
      "https://github.com/owner/site/issues/42",
    );
    expect(sitePath("#content", "/fork/")).toBe("#content");
  });
});
