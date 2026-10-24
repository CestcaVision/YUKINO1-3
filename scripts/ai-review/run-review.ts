import type { AiConfig } from "../../src/ai/config.ts";
import {
  GENERATED_ARTICLE_DISCLAIMER,
  generatedArticleSchema,
  type GeneratedArticle,
  type ReviewClaim,
} from "../../src/ai/generated-article.ts";
import type {
  AiProvider,
  DraftNoteReviewInput,
} from "../../src/ai/provider.ts";
import { redactSecrets } from "../../src/ai/redact.ts";
import { checkUsage, type UsageRecord } from "../../src/ai/usage-limiter.ts";

export type ReviewRunResult =
  | { status: "disabled"; reason: string }
  | { status: "limited"; reason: string; usageRecord: UsageRecord }
  | {
      status: "completed";
      reviewMarkdown: string;
      generatedArticle: GeneratedArticle | null;
      usageRecord: UsageRecord;
    }
  | { status: "failed"; reason: string; usageRecord: UsageRecord };

export interface RunReviewInput {
  /** Null when the AI feature is not configured (see loadAiConfig). */
  config: AiConfig | null;
  /** Null whenever config is null; may also be null if no provider adapter matched config.provider. */
  provider: AiProvider | null;
  input: DraftNoteReviewInput;
  sourceBriefIssueNumber: number;
  usageRecord: UsageRecord | null;
  now: Date;
}

function renderReviewMarkdown(claims: ReviewClaim[]): string {
  if (claims.length === 0) {
    return "The model made no claims that need reviewing.";
  }
  return claims
    .map((claim, index) =>
      [
        `### Claim ${index + 1}`,
        "",
        `- Before: ${claim.before || "(none — newly added)"}`,
        `- After: ${claim.after}`,
        `- Rationale: ${claim.rationale}`,
      ].join("\n"),
    )
    .join("\n\n");
}

/**
 * Runs the optional, vendor-agnostic AI review experiment. Every prompt,
 * model output, and Issue input passed through here is treated as untrusted
 * data: it is never executed, and every text field is redacted for
 * configured secrets before this returns.
 *
 * - No config or no provider adapter -> "disabled": the deterministic Note
 *   workflow and site build are never affected by this.
 * - Usage limit reached -> "limited": no call is made and nothing partial
 *   is produced.
 * - Otherwise the provider is called once, and any freely generated or
 *   substantially rewritten output is modeled as a Generated Article
 *   (ADR 0002), never as Note content.
 */
export async function runOptionalAiReview(
  run: RunReviewInput,
): Promise<ReviewRunResult> {
  if (!run.config || !run.provider) {
    return {
      status: "disabled",
      reason: "No AI provider is configured; skipping the optional review.",
    };
  }
  const config = run.config;
  const provider = run.provider;

  const usage = checkUsage(
    run.usageRecord,
    {
      maxCallsPerRun: config.maxCallsPerRun,
      maxCallsPerPeriod: config.maxCallsPerPeriod,
    },
    run.now,
    0,
  );

  if (!usage.allowed) {
    return {
      status: "limited",
      reason: usage.reason ?? "AI usage limit reached",
      usageRecord: usage.record,
    };
  }

  const redact = (text: string) => redactSecrets(text, [config.apiKey]);

  let output;
  try {
    output = await provider.review(run.input);
  } catch (error) {
    // The call was actually made (and counted by checkUsage above) even
    // though it failed, so its usageRecord must still be persisted —
    // otherwise a persistently failing provider (bad credential, flaky
    // vendor API) would never trip the monthly limit.
    return {
      status: "failed",
      reason: redact(String(error)),
      usageRecord: usage.record,
    };
  }

  const claims: ReviewClaim[] = output.claims.map((claim) => ({
    before: redact(claim.before),
    after: redact(claim.after),
    rationale: redact(claim.rationale),
  }));

  let generatedArticle: GeneratedArticle | null = null;
  if (output.generatedArticleBody) {
    const parsed = generatedArticleSchema.safeParse({
      sourceBriefIssue: run.sourceBriefIssueNumber,
      provider: config.provider,
      model: config.model,
      generatedAt: run.now,
      claims,
      body: redact(output.generatedArticleBody),
      disclaimer: GENERATED_ARTICLE_DISCLAIMER,
    });
    generatedArticle = parsed.success ? parsed.data : null;
  }

  return {
    status: "completed",
    reviewMarkdown: renderReviewMarkdown(claims),
    generatedArticle,
    usageRecord: usage.record,
  };
}
