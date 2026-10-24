import matter from "gray-matter";
import { isAuthorized } from "./authorize.ts";
import { classifySourceBrief } from "./classify.ts";
import {
  buildSourceBriefCandidate,
  parseIssueFormBody,
  type SourceBrief,
} from "./issue-form.ts";
import { noteSchema, type Note } from "../../src/schemas/note.ts";

export interface ExistingPullRequest {
  number: number;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
}

export interface ProcessIssueInput {
  issueNumber: number;
  issueBody: string;
  /** ISO 8601 timestamp the issue was opened at (`github.event.issue.created_at`). */
  issueCreatedAt: string;
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
      data: Note;
      sourceBrief: SourceBrief;
    };

export function branchNameFor(issueNumber: number): string {
  return `note/issue-${issueNumber}`;
}

export function filePathFor(issueNumber: number): string {
  const padded = String(issueNumber).padStart(6, "0");
  return `src/content/notes/issue-${padded}.md`;
}

function slugFor(title: string, issueNumber: number): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : `note-issue-${issueNumber}`;
}

function summaryFor(question: string): string {
  const trimmed = question.trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
}

/** Exported for reuse by the optional AI review script (scripts/ai-review/), which
 * reconstructs the same deterministic Draft Note body without re-fetching the pull request. */
export function renderNoteBody(brief: SourceBrief): string {
  return [
    "## Question",
    "",
    brief.question,
    "",
    "## Your preliminary explanation",
    "",
    brief.explanation,
    "",
    "## Example or derivation",
    "",
    brief.example,
    "",
    "## Uncertainties",
    "",
    brief.uncertainties,
    "",
    "## Requested assistance",
    "",
    brief.assistance,
    "",
    "## Allowed sources",
    "",
    brief.allowedSources,
    "",
  ].join("\n");
}

/** Serializes via gray-matter so untrusted field values can never break out of YAML frontmatter. */
export function renderNoteFile(data: Note, brief: SourceBrief): string {
  // js-yaml (via gray-matter) throws on an explicit `undefined` value rather
  // than omitting the key, so a pending classification's unset subject,
  // media, and capabilities must be dropped before serializing.
  const frontmatter = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  return matter.stringify(renderNoteBody(brief), frontmatter);
}

function classificationSummary(
  classification: ReturnType<typeof classifySourceBrief>,
): string {
  if (classification.status === "confirmed") {
    return [
      "Recommended classification (confirmed, from the controlled vocabulary):",
      `- Subject: ${classification.subject}`,
      `- Medium: ${classification.media?.join(", ")}`,
      `- Capability: ${classification.capabilities?.join(", ")}`,
    ].join("\n");
  }

  return [
    "Classification is **pending confirmation** — it was not confident enough to set automatically:",
    ...classification.reasons.map((reason) => `- ${reason}`),
    "",
    "Set `classification: confirmed` together with `subject`, `media`, and `capabilities` in the frontmatter before publishing.",
  ].join("\n");
}

/**
 * Pure decision function: given a Source Brief issue and enough context to
 * check authorization and prior processing, decides what (if anything)
 * should happen. Performs no I/O and calls no generative service —
 * classification uses controlled-vocabulary keyword matching only.
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
        "Only the repository owner or an explicitly approved actor can submit a Source Brief through this form. No content was changed.",
    };
  }

  if (input.existingPullRequest) {
    const existingPullRequest = input.existingPullRequest;
    return {
      status: "already-processed",
      existingPullRequest,
      comment: `This Source Brief was already processed: ${existingPullRequest.url}`,
    };
  }

  const fields = parseIssueFormBody(input.issueBody);
  const result = buildSourceBriefCandidate(fields);

  if (!result.success) {
    return {
      status: "invalid",
      errors: result.errors,
      comment: [
        "This Source Brief could not be recorded and no content was changed. Please open a new issue after fixing:",
        "",
        ...result.errors.map((error) => `- ${error}`),
      ].join("\n"),
    };
  }

  const { issueNumber } = input;
  const brief = result.data;
  const classification = classifySourceBrief(brief);

  // Defensive only: classify.ts reports a field solely when it holds a valid
  // controlled-vocabulary value, so this can never actually fail.
  const parsed = noteSchema.safeParse({
    title: brief.title,
    summary: summaryFor(brief.question),
    slug: slugFor(brief.title, issueNumber),
    date: input.issueCreatedAt,
    lifecycle: "review",
    classification: classification.status,
    subject: classification.subject,
    media: classification.media,
    capabilities: classification.capabilities,
  });

  if (!parsed.success) {
    const errors = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(value)"}: ${issue.message}`,
    );
    return {
      status: "invalid",
      errors,
      comment: [
        "This Source Brief could not be recorded and no content was changed. Please open a new issue after fixing:",
        "",
        ...errors.map((error) => `- ${error}`),
      ].join("\n"),
    };
  }

  const data: Note = parsed.data;

  return {
    status: "ready",
    branchName: branchNameFor(issueNumber),
    filePath: filePathFor(issueNumber),
    fileContent: renderNoteFile(data, brief),
    commitMessage: `feat: add Draft Note from issue #${issueNumber}`,
    prTitle: `Draft Note: ${brief.title}`,
    prBody: [
      `Deterministically generated from #${issueNumber}. No generative AI was used to produce this change.`,
      "",
      classificationSummary(classification),
      "",
      "This is a Draft Note (`lifecycle: review`): it will not appear on the site until you review it, confirm classification if pending, set `lifecycle: published`, and merge — per ADR 0001.",
      "",
      `Closes #${issueNumber}`,
    ].join("\n"),
    data,
    sourceBrief: brief,
  };
}
