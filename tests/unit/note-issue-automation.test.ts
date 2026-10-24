import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isAuthorized } from "../../scripts/note/authorize.ts";
import { classifySourceBrief } from "../../scripts/note/classify.ts";
import {
  buildSourceBriefCandidate,
  parseIssueFormBody,
} from "../../scripts/note/issue-form.ts";
import {
  branchNameFor,
  filePathFor,
  processIssue,
  renderNoteFile,
} from "../../scripts/note/process-issue.ts";
import { noteSchema } from "../../src/schemas/note.ts";

const scriptsDir = fileURLToPath(
  new URL("../../scripts/note/", import.meta.url),
);

const MATH_EXPLANATION =
  "Completing the square rewrites a quadratic as a squared binomial plus a constant, which reveals the vertex of the parabola directly from the algebra.";

function representativeIssueBody({
  title = "Why does completing the square work?",
  question = "Why does completing the square always find the vertex of a parabola?",
  explanation = MATH_EXPLANATION,
  example = "For x^2 + 6x + 5, I add and subtract 9 to get (x+3)^2 - 4, so the vertex is (-3, -4).",
  uncertainties = "I am not sure why the constant we add is always (b/2)^2.",
  assistance = "Please check my derivation and suggest a cleaner way to present it.",
  allowedSources = "My own classroom notes only.",
}: Partial<{
  title: string;
  question: string;
  explanation: string;
  example: string;
  uncertainties: string;
  assistance: string;
  allowedSources: string;
}> = {}): string {
  return `### Title

${title}

### Your question

${question}

### Your own preliminary explanation

${explanation}

### Example or derivation

${example}

### Uncertainties

${uncertainties}

### Requested assistance

${assistance}

### Allowed source scope

${allowedSources}
`;
}

describe("parseIssueFormBody", () => {
  it("parses every rendered Issue Form heading into a value", () => {
    const fields = parseIssueFormBody(representativeIssueBody());
    expect(fields["Title"]).toBe("Why does completing the square work?");
    expect(fields["Your own preliminary explanation"]).toBe(MATH_EXPLANATION);
  });

  it("treats GitHub's '_No response_' placeholder as empty", () => {
    const fields = parseIssueFormBody(
      representativeIssueBody({ uncertainties: "_No response_" }),
    );
    expect(fields["Uncertainties"]).toBe("");
  });

  it("handles CRLF line endings", () => {
    const body = representativeIssueBody().replace(/\n/g, "\r\n");
    const fields = parseIssueFormBody(body);
    expect(fields["Title"]).toBe("Why does completing the square work?");
  });

  it("does not let an embedded '### '-prefixed line inside a value truncate that value", () => {
    const body = representativeIssueBody({
      explanation: `${MATH_EXPLANATION}\n### Not a real heading\nstill part of my answer`,
    });
    const fields = parseIssueFormBody(body);
    expect(fields["Your own preliminary explanation"]).toBe(
      `${MATH_EXPLANATION}\n### Not a real heading\nstill part of my answer`,
    );
    expect(fields["Requested assistance"]).toBe(
      "Please check my derivation and suggest a cleaner way to present it.",
    );
  });
});

describe("buildSourceBriefCandidate", () => {
  it("accepts a complete Source Brief", () => {
    const result = buildSourceBriefCandidate(
      parseIssueFormBody(representativeIssueBody()),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Why does completing the square work?");
      expect(result.data.explanation).toBe(MATH_EXPLANATION);
    }
  });

  it("rejects a missing title", () => {
    const result = buildSourceBriefCandidate(
      parseIssueFormBody(representativeIssueBody({ title: "" })),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a title containing a newline, even from an issue created directly via the API", () => {
    const result = buildSourceBriefCandidate(
      parseIssueFormBody(
        representativeIssueBody({ title: "Line one\nLine two" }),
      ),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((error) => error.includes("Title"))).toBe(true);
    }
  });

  it("rejects a trivial placeholder explanation", () => {
    const result = buildSourceBriefCandidate(
      parseIssueFormBody(representativeIssueBody({ explanation: "N/A" })),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.errors.some((error) =>
          error.includes("Your own preliminary explanation"),
        ),
      ).toBe(true);
    }
  });

  it("lists every missing field, not just the first", () => {
    const result = buildSourceBriefCandidate(
      parseIssueFormBody(
        representativeIssueBody({
          question: "",
          explanation: "",
          example: "",
          uncertainties: "",
          assistance: "",
          allowedSources: "",
        }),
      ),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(6);
    }
  });
});

describe("classifySourceBrief", () => {
  it("confidently classifies a well-matched mathematics brief", () => {
    const result = classifySourceBrief({
      question: "Why does completing the square always find the vertex?",
      explanation: MATH_EXPLANATION,
      example: "For x^2 + 6x + 5 I derive (x+3)^2 - 4 using the theorem.",
      uncertainties: "Not sure why the constant works in general.",
      assistance: "Please check my proof.",
    });
    expect(result.status).toBe("confirmed");
    expect(result.subject).toBe("Mathematics");
    expect(result.media).toContain("Written explanation");
    expect(result.capabilities).toContain("Explains a mathematical idea");
  });

  it("leaves classification pending when no controlled keyword matches", () => {
    const result = classifySourceBrief({
      question: "What happened yesterday at lunch?",
      explanation: "We went to a new place and tried something different.",
      example: "It was near the old station.",
      uncertainties: "Not sure what to order next time.",
      assistance: "Just curious what others think.",
    });
    expect(result.status).toBe("pending");
    expect(result.subject).toBeUndefined();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("leaves the subject pending on an ambiguous tie rather than guessing", () => {
    const result = classifySourceBrief({
      question: "How is a vector used to describe a market?",
      explanation: "n/a",
      example: "n/a",
      uncertainties: "n/a",
      assistance: "n/a",
    });
    expect(result.subject).toBeUndefined();
    expect(result.status).toBe("pending");
    expect(result.reasons.some((reason) => reason.includes("ambiguous"))).toBe(
      true,
    );
  });

  it("never returns a label outside the controlled vocabulary", () => {
    const result = classifySourceBrief({
      question: MATH_EXPLANATION,
      explanation: MATH_EXPLANATION,
      example: MATH_EXPLANATION,
      uncertainties: MATH_EXPLANATION,
      assistance: MATH_EXPLANATION,
    });
    const validSubjects = [
      "Mathematics",
      "Economics",
      "Physics",
      "Computer Science",
    ];
    if (result.subject) expect(validSubjects).toContain(result.subject);
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

  it("rejects everyone else", () => {
    expect(isAuthorized(base)).toBe(false);
  });
});

describe("processIssue", () => {
  const authorizedContext = {
    actorLogin: "YUKINO1-3",
    authorAssociation: "OWNER",
    repositoryOwner: "YUKINO1-3",
    issueCreatedAt: "2026-09-04T10:00:00Z",
  };

  it("does not modify content for an unauthorized actor", () => {
    const decision = processIssue({
      issueNumber: 11,
      issueBody: representativeIssueBody(),
      issueCreatedAt: "2026-09-04T10:00:00Z",
      actorLogin: "an-attacker",
      authorAssociation: "NONE",
      repositoryOwner: "YUKINO1-3",
    });
    expect(decision.status).toBe("unauthorized");
  });

  it("does not modify content for an incomplete Source Brief", () => {
    const decision = processIssue({
      issueNumber: 11,
      issueBody: representativeIssueBody({ explanation: "N/A" }),
      ...authorizedContext,
    });
    expect(decision.status).toBe("invalid");
    if (decision.status === "invalid") {
      expect(decision.errors.length).toBeGreaterThan(0);
    }
  });

  it("deterministically generates a confirmed, ready Draft Note with no AI involvement", () => {
    const decision = processIssue({
      issueNumber: 12,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
    });
    expect(decision.status).toBe("ready");
    if (decision.status !== "ready") return;

    expect(decision.branchName).toBe(branchNameFor(12));
    expect(decision.filePath).toBe(filePathFor(12));
    expect(decision.fileContent).toBe(
      renderNoteFile(decision.data, decision.sourceBrief),
    );
    expect(noteSchema.safeParse(decision.data).success).toBe(true);
    expect(decision.data.lifecycle).toBe("review");
    expect(decision.data.classification).toBe("confirmed");
    expect(decision.prBody).toContain("No generative AI");
    expect(decision.prBody).toContain("Closes #12");
  });

  it("marks a Draft Note pending confirmation instead of silently choosing a label", () => {
    const decision = processIssue({
      issueNumber: 13,
      issueBody: representativeIssueBody({
        title: "A question",
        question: "What happened yesterday at lunch?",
        explanation:
          "We went to a new place and tried something quite different from usual.",
        example: "It was near the old station building.",
        uncertainties: "Not sure what to order next time we go.",
        assistance: "Just curious what others think about it.",
      }),
      ...authorizedContext,
    });
    expect(decision.status).toBe("ready");
    if (decision.status !== "ready") return;

    expect(decision.data.classification).toBe("pending");
    expect(decision.data.subject).toBeUndefined();
    expect(decision.prBody).toContain("pending confirmation");
    expect(noteSchema.safeParse(decision.data).success).toBe(true);
  });

  it("is idempotent: the same issue always produces the same decision", () => {
    const input = {
      issueNumber: 14,
      issueBody: representativeIssueBody(),
      ...authorizedContext,
    };
    expect(processIssue(input)).toEqual(processIssue(input));
  });

  it("treats an already-open pull request as fully processed, without regenerating content", () => {
    const decision = processIssue({
      issueNumber: 15,
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

  it("checks authorization before existing-PR state", () => {
    const unauthorizedButProcessed = processIssue({
      issueNumber: 16,
      issueBody: representativeIssueBody(),
      actorLogin: "an-attacker",
      authorAssociation: "NONE",
      repositoryOwner: "YUKINO1-3",
      issueCreatedAt: "2026-09-04T10:00:00Z",
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
  it("contains no network, HTTP, or AI/LLM SDK calls anywhere in the Note automation", () => {
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
