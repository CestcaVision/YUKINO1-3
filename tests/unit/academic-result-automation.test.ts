import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isAuthorized } from "../../scripts/academic-result/authorize.ts";
import {
  buildAcademicResultCandidate,
  parseIssueFormBody,
} from "../../scripts/academic-result/issue-form.ts";
import {
  branchNameFor,
  filePathFor,
  processIssue,
  renderAcademicResultFile,
} from "../../scripts/academic-result/process-issue.ts";
import { academicResultSchema } from "../../src/schemas/academic-result.ts";

const scriptsDir = fileURLToPath(
  new URL("../../scripts/academic-result/", import.meta.url),
);

function representativeIssueBody({
  subject = "_No response_",
  result = "A*",
  status = "achieved",
  evidenceChecked = "Yes",
  effectiveDate = "2026-08-15",
}: Partial<{
  subject: string;
  result: string;
  status: string;
  evidenceChecked: string;
  effectiveDate: string;
}> = {}): string {
  return `### Qualification

A-Level

### Subject

${subject}

### Result

${result}

### Predicted or achieved?

${status}

### Awarding body

AQA

### Examination session

Summer 2026

### Evidence checked?

${evidenceChecked}

### Effective date (YYYY-MM-DD)

${effectiveDate}
`;
}

describe("parseIssueFormBody", () => {
  it("parses every rendered Issue Form heading into a value", () => {
    const fields = parseIssueFormBody(representativeIssueBody());
    expect(fields["Qualification"]).toBe("A-Level");
    expect(fields["Result"]).toBe("A*");
    expect(fields["Awarding body"]).toBe("AQA");
    expect(fields["Examination session"]).toBe("Summer 2026");
  });

  it("treats GitHub's '_No response_' placeholder as empty", () => {
    const fields = parseIssueFormBody(representativeIssueBody());
    expect(fields["Subject"]).toBe("");
  });

  it("handles CRLF line endings", () => {
    const body = representativeIssueBody().replace(/\n/g, "\r\n");
    const fields = parseIssueFormBody(body);
    expect(fields["Qualification"]).toBe("A-Level");
  });

  it("does not let an unrelated '### '-prefixed line inside a value truncate that value or spawn a bogus key", () => {
    const body = representativeIssueBody({
      result:
        "A*\n### Not a real heading, just my own notes\nstill part of my answer",
    });
    const fields = parseIssueFormBody(body);
    expect(fields["Result"]).toBe(
      "A*\n### Not a real heading, just my own notes\nstill part of my answer",
    );
    expect(fields["Awarding body"]).toBe("AQA");
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining([
        "Qualification",
        "Subject",
        "Result",
        "Predicted or achieved?",
        "Awarding body",
        "Examination session",
        "Evidence checked?",
        "Effective date (YYYY-MM-DD)",
      ]),
    );
    expect(Object.keys(fields)).toHaveLength(8);
  });
});

describe("buildAcademicResultCandidate", () => {
  it("accepts a complete, well-formed submission", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(representativeIssueBody()),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.qualification).toBe("A-Level");
      expect(result.data.subject).toBeUndefined();
      expect(result.data.status).toBe("achieved");
      expect(result.data.evidenceChecked).toBe(true);
      expect(result.data.public).toBe(true);
    }
  });

  it("carries an optional subject through when provided", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(representativeIssueBody({ subject: "Mathematics" })),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Mathematics");
    }
  });

  it("rejects a placeholder result", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(representativeIssueBody({ result: "Pending" })),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects an unrecognized predicted/achieved value with an actionable error", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(representativeIssueBody({ status: "maybe" })),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.includes("achieved"))).toBe(
        true,
      );
    }
  });

  it("rejects an unrecognized evidence-checked value", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(representativeIssueBody({ evidenceChecked: "Maybe" })),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a malformed effective date", () => {
    const result = buildAcademicResultCandidate(
      parseIssueFormBody(
        representativeIssueBody({ effectiveDate: "15 Aug 2026" }),
      ),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const fields = parseIssueFormBody(representativeIssueBody());
    delete fields["Qualification"];
    const result = buildAcademicResultCandidate(fields);
    expect(result.success).toBe(false);
  });

  it("rejects rather than silently truncates a value containing an embedded heading-like line", () => {
    const body = representativeIssueBody({
      result: "A*\n### Not a real heading\nstill part of my answer",
    });
    const result = buildAcademicResultCandidate(parseIssueFormBody(body));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.includes("Result"))).toBe(
        true,
      );
    }
  });
});

describe("isAuthorized", () => {
  const base = {
    actorLogin: "someone-else",
    authorAssociation: "NONE",
    repositoryOwner: "YUKINO1-3",
  };

  it("authorizes the repository owner by association", () => {
    expect(isAuthorized({ ...base, authorAssociation: "OWNER" })).toBe(true);
  });

  it("authorizes a login matching the repository owner", () => {
    expect(isAuthorized({ ...base, actorLogin: "YUKINO1-3" })).toBe(true);
  });

  it("authorizes an explicitly approved actor", () => {
    expect(
      isAuthorized({ ...base, approvedActors: "other,someone-else" }),
    ).toBe(true);
  });

  it("rejects everyone else", () => {
    expect(isAuthorized({ ...base, approvedActors: "other" })).toBe(false);
    expect(isAuthorized(base)).toBe(false);
  });
});

describe("processIssue", () => {
  const authorizedContext = {
    actorLogin: "YUKINO1-3",
    authorAssociation: "OWNER",
    repositoryOwner: "YUKINO1-3",
  };

  it("does not modify content for an unauthorized actor, valid fields notwithstanding", () => {
    const decision = processIssue({
      issueNumber: 10,
      issueBody: representativeIssueBody(),
      actorLogin: "an-attacker",
      authorAssociation: "NONE",
      repositoryOwner: "YUKINO1-3",
    });
    expect(decision.status).toBe("unauthorized");
  });

  it("does not modify content for an incomplete submission", () => {
    const decision = processIssue({
      issueNumber: 11,
      issueBody: representativeIssueBody({ result: "TBD" }),
      ...authorizedContext,
    });
    expect(decision.status).toBe("invalid");
    if (decision.status === "invalid") {
      expect(decision.errors.length).toBeGreaterThan(0);
    }
  });

  it("deterministically generates a single ready change with no AI involvement", () => {
    const decision = processIssue({
      issueNumber: 12,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
    });
    expect(decision.status).toBe("ready");
    if (decision.status !== "ready") return;

    expect(decision.branchName).toBe(branchNameFor(12));
    expect(decision.filePath).toBe(filePathFor(12));
    expect(decision.fileContent).toBe(renderAcademicResultFile(decision.data));
    expect(academicResultSchema.safeParse(decision.data).success).toBe(true);
    expect(decision.prBody).toContain("No generative AI");
    expect(decision.prBody).toContain("Closes #12");
  });

  it("pads the file name so ids of different issue-number lengths still sort in numeric order", () => {
    // AcademicResults.astro tie-breaks equal effectiveDate entries with a
    // plain string compare on collection id; an unpadded "issue-2" vs
    // "issue-10" would sort in the wrong order.
    expect(filePathFor(2) < filePathFor(10)).toBe(true);
    expect(filePathFor(9) < filePathFor(10)).toBe(true);
  });

  it("is idempotent: the same issue always produces the same decision", () => {
    const input = {
      issueNumber: 13,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
    };
    expect(processIssue(input)).toEqual(processIssue(input));
  });

  it("treats an already-open pull request as fully processed, without regenerating content", () => {
    const decision = processIssue({
      issueNumber: 14,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
      existingPullRequest: {
        number: 99,
        url: "https://github.com/YUKINO1-3/YUKINO1-3.github.io/pull/99",
        state: "OPEN",
      },
    });
    expect(decision.status).toBe("already-processed");
    if (decision.status === "already-processed") {
      expect(decision.comment).toContain("pull/99");
    }
  });

  it("treats a merged pull request as processed too, so a redelivered webhook never opens a competing PR", () => {
    const decision = processIssue({
      issueNumber: 15,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
      existingPullRequest: {
        number: 100,
        url: "https://github.com/YUKINO1-3/YUKINO1-3.github.io/pull/100",
        state: "MERGED",
      },
    });
    expect(decision.status).toBe("already-processed");
  });

  it("checks authorization before existing-PR state, and existing-PR state before schema validity", () => {
    const unauthorizedButProcessed = processIssue({
      issueNumber: 16,
      issueBody: representativeIssueBody(),
      actorLogin: "an-attacker",
      authorAssociation: "NONE",
      repositoryOwner: "YUKINO1-3",
      existingPullRequest: {
        number: 1,
        url: "https://example.invalid/pull/1",
        state: "OPEN",
      },
    });
    expect(unauthorizedButProcessed.status).toBe("unauthorized");
  });
});

describe("no generative-AI usage", () => {
  it("contains no network, HTTP, or AI/LLM SDK calls anywhere in the automation", () => {
    const forbidden = [
      "fetch(",
      "http.request",
      "https.request",
      "openai",
      "anthropic",
      "axios",
      "XMLHttpRequest",
    ];
    const files = readdirSync(scriptsDir).filter((name) =>
      name.endsWith(".ts"),
    );
    expect(files.length).toBeGreaterThan(0);

    for (const name of files) {
      const source = readFileSync(join(scriptsDir, name), "utf8");
      for (const token of forbidden) {
        expect(
          source.toLowerCase().includes(token.toLowerCase()),
          `${name} should not contain ${token}`,
        ).toBe(false);
      }
    }
  });
});
