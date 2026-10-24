import { processIssue, type ExistingPullRequest } from "./process-issue.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readExistingPullRequest(): ExistingPullRequest | null {
  const number = process.env.EXISTING_PR_NUMBER;
  const url = process.env.EXISTING_PR_URL;
  const state = process.env.EXISTING_PR_STATE;
  if (!number || !url || !state) return null;
  if (state !== "OPEN" && state !== "CLOSED" && state !== "MERGED") {
    throw new Error(`Unrecognized EXISTING_PR_STATE: ${state}`);
  }
  return { number: Number(number), url, state };
}

const decision = processIssue({
  issueNumber: Number(requireEnv("ISSUE_NUMBER")),
  issueBody: process.env.ISSUE_BODY ?? "",
  issueCreatedAt: requireEnv("ISSUE_CREATED_AT"),
  actorLogin: requireEnv("ISSUE_USER_LOGIN"),
  authorAssociation: process.env.ISSUE_AUTHOR_ASSOCIATION ?? "NONE",
  repositoryOwner: requireEnv("REPOSITORY_OWNER"),
  approvedActors: process.env.APPROVED_ACTORS,
  existingPullRequest: readExistingPullRequest(),
});

process.stdout.write(JSON.stringify(decision));
