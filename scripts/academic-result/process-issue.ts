import matter from "gray-matter";
import { isAuthorized } from "./authorize.ts";
import {
  buildAcademicResultCandidate,
  parseIssueFormBody,
} from "./issue-form.ts";
import type { AcademicResult } from "../../src/schemas/academic-result.ts";

export interface ExistingPullRequest {
  number: number;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
}

export interface ProcessIssueInput {
  issueNumber: number;
  issueBody: string;
  actorLogin: string;
  authorAssociation: string;
  repositoryOwner: string;
  approvedActors?: string;
  existingPullRequest?: ExistingPullRequest | null;
}

export type ProcessIssueDecision =
  | { status: "unauthorized"; comment: string }
  | { status: "invalid"; comment: string; errors: string[] }
  | {
      status: "already-processed";
      comment: string;
      existingPullRequest: ExistingPullRequest;
    }
  | {
      status: "ready";
      branchName: string;
      filePath: string;
      fileContent: string;
      commitMessage: string;
      prTitle: string;
      prBody: string;
      data: AcademicResult;
    };

export function branchNameFor(issueNumber: number): string {
  return `academic-result/issue-${issueNumber}`;
}

export function filePathFor(issueNumber: number): string {
  // Zero-padded so the collection id sorts numerically: AcademicResults.astro
  // tie-breaks equal effectiveDate entries with a plain string compare on id,
  // which would otherwise place e.g. "issue-10" before "issue-2".
  const padded = String(issueNumber).padStart(6, "0");
  return `src/content/academic-results/issue-${padded}.md`;
}

/** Serializes via gray-matter so untrusted field values can never break out of YAML frontmatter. */
export function renderAcademicResultFile(data: AcademicResult): string {
  return matter.stringify("", data);
}

/**
 * Pure decision function: given an issue and enough context to check
 * authorization and prior processing, decides what (if anything) should
 * happen. Performs no I/O and calls no external or generative service —
 * every outcome is a deterministic function of the input.
 */
export function processIssue(input: ProcessIssueInput): ProcessIssueDecision {
  if (
    !isAuthorized({
      actorLogin: input.actorLogin,
      authorAssociation: input.authorAssociation,
      repositoryOwner: input.repositoryOwner,
      approvedActors: input.approvedActors,
    })
  ) {
    return {
      status: "unauthorized",
      comment:
        "Only the repository owner or an explicitly approved actor can submit an Academic Result through this form. No content was changed.",
    };
  }

  if (input.existingPullRequest) {
    const existingPullRequest = input.existingPullRequest;
    return {
      status: "already-processed",
      existingPullRequest,
      comment: `This Academic Result was already processed: ${existingPullRequest.url}`,
    };
  }

  const fields = parseIssueFormBody(input.issueBody);
  const result = buildAcademicResultCandidate(fields);

  if (!result.success) {
    return {
      status: "invalid",
      errors: result.errors,
      comment: [
        "This Academic Result could not be recorded and no content was changed. Please open a new issue after fixing:",
        "",
        ...result.errors.map((error) => `- ${error}`),
      ].join("\n"),
    };
  }

  const { issueNumber } = input;
  const subjectSuffix = result.data.subject ? ` (${result.data.subject})` : "";

  return {
    status: "ready",
    branchName: branchNameFor(issueNumber),
    filePath: filePathFor(issueNumber),
    fileContent: renderAcademicResultFile(result.data),
    commitMessage: `feat: add Academic Result from issue #${issueNumber}`,
    prTitle: `Academic Result: ${result.data.qualification}${subjectSuffix}`,
    prBody: [
      `Deterministically generated from #${issueNumber}. No generative AI was used to produce this change.`,
      "",
      "Review the evidence before merging: merging this pull request is the explicit approval to publish, per ADR 0001.",
      "",
      `Closes #${issueNumber}`,
    ].join("\n"),
    data: result.data,
  };
}
