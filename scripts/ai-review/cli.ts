import { mkdirSync, writeFileSync } from "node:fs";
import { loadAiConfig } from "../../src/ai/config.ts";
import type { AiProvider } from "../../src/ai/provider.ts";
import {
  buildSourceBriefCandidate,
  parseIssueFormBody,
} from "../note/issue-form.ts";
import { renderNoteBody } from "../note/process-issue.ts";
import { createProvider } from "./provider-factory.ts";
import { readUsageRecord, writeUsageRecord } from "./usage-store.ts";
import { runOptionalAiReview } from "./run-review.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const issueNumber = Number(requireEnv("ISSUE_NUMBER"));
  const issueBody = process.env.ISSUE_BODY ?? "";
  const outputDir = process.env.AI_REVIEW_OUTPUT_DIR ?? "ai-review-output";
  const usagePath = process.env.AI_USAGE_STATE_PATH ?? ".ai-review/usage.json";

  const config = loadAiConfig(process.env);

  let provider: AiProvider | null = null;
  let unsupportedReason: string | null = null;
  if (config) {
    try {
      provider = createProvider(config);
    } catch (error) {
      unsupportedReason = (error as Error).message;
    }
  }

  const briefResult = buildSourceBriefCandidate(parseIssueFormBody(issueBody));

  const result = unsupportedReason
    ? ({ status: "disabled", reason: unsupportedReason } as const)
    : !briefResult.success
      ? ({
          status: "disabled",
          reason:
            "The Source Brief is not a valid, complete submission; skipping the optional review.",
        } as const)
      : await runOptionalAiReview({
          config,
          provider,
          input: {
            sourceBrief: briefResult.data,
            draftNoteBody: renderNoteBody(briefResult.data),
          },
          sourceBriefIssueNumber: issueNumber,
          usageRecord: readUsageRecord(usagePath),
          now: new Date(),
        });

  if (result.status === "completed") {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(`${outputDir}/review.md`, result.reviewMarkdown);
    if (result.generatedArticle) {
      writeFileSync(
        `${outputDir}/generated-article.json`,
        JSON.stringify(result.generatedArticle, null, 2),
      );
    }
  }

  if ("usageRecord" in result) {
    writeUsageRecord(usagePath, result.usageRecord);
  }

  process.stdout.write(
    JSON.stringify({
      status: result.status,
      reason: "reason" in result ? result.reason : undefined,
    }),
  );
}

main().catch((error) => {
  // The optional AI review must never fail the pipeline it runs alongside;
  // report the failure and exit cleanly rather than throwing.
  process.stdout.write(
    JSON.stringify({ status: "failed", reason: String(error) }),
  );
});
