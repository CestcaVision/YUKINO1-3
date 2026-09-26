import { describe, expect, it } from "vitest";
import type { ZodType } from "astro/zod";
import { collections } from "../../src/content.config";

// Every collection here defines `schema` as a static Zod object rather than
// the context-dependent function form Astro's type also allows.
function parse(collection: keyof typeof collections, data: unknown) {
  const schema = collections[collection].schema as ZodType;
  return schema.safeParse(data);
}

const baseWork = {
  title: "A work",
  summary: "A summary",
  slug: "a-work",
  date: "2026-01-01",
  lifecycle: "published",
  subject: "Mathematics",
  category: "Interactive systems",
  media: ["Web experience"],
  capabilities: ["Interprets evidence"],
  contribution: "I built it",
  evidence: {
    problem: "p",
    hypothesis: "h",
    process: "pr",
    decisions: "d",
    outcome: "o",
    validation: "v",
    limitations: "l",
  },
};

const baseAcademicResult = {
  qualification: "A-Level",
  result: "A*",
  status: "achieved",
  awardingBody: "AQA",
  examinationSession: "Summer 2026",
  evidenceChecked: true,
  effectiveDate: "2026-08-15",
  public: true,
};

describe("work schema", () => {
  it("accepts a well-formed work", () => {
    expect(parse("works", baseWork).success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    const result = parse("works", { ...baseWork, slug: "Not A Slug" });
    expect(result.success).toBe(false);
  });

  it("rejects an updated date earlier than the publish date", () => {
    const result = parse("works", {
      ...baseWork,
      date: "2026-06-01",
      updated: "2026-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an updated date on or after the publish date", () => {
    const result = parse("works", {
      ...baseWork,
      date: "2026-01-01",
      updated: "2026-06-01",
    });
    expect(result.success).toBe(true);
  });
});

describe("academic result schema", () => {
  it("accepts a real grade", () => {
    expect(parse("academicResults", baseAcademicResult).success).toBe(true);
  });

  it.each(["pending", "TBD", "tbc", "N/A", "-"])(
    "rejects the placeholder result %j",
    (result) => {
      const parsed = parse("academicResults", {
        ...baseAcademicResult,
        result,
      });
      expect(parsed.success).toBe(false);
    },
  );
});
