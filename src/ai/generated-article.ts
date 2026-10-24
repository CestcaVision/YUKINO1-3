import { z } from "astro/zod";

export const reviewClaimSchema = z.object({
  /** The applicant's original text this claim touches, or "" if newly added. */
  before: z.string(),
  after: z.string(),
  rationale: z.string().trim().min(1),
});

export const GENERATED_ARTICLE_DISCLAIMER =
  "Generated Article: freely produced or substantially rewritten by AI. Not a Note, not applicant evidence (ADR 0002).";

/**
 * A Generated Article is content AI freely produced or substantially
 * rewrote. Per ADR 0002 it is never a Note or admissions evidence: this
 * schema is used only to shape the private CI review artifact written by
 * scripts/ai-review/ (see docs/ai-review.md), and it is intentionally never
 * registered in src/content.config.ts, so it can never become an Astro
 * content collection entry and can never reach a public page, the Notes
 * index, Featured Work, Capability evidence, sitemap, or RSS feed.
 */
export const generatedArticleSchema = z.object({
  sourceBriefIssue: z.number().int().positive(),
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  generatedAt: z.coerce.date(),
  claims: z.array(reviewClaimSchema),
  body: z.string(),
  disclaimer: z.literal(GENERATED_ARTICLE_DISCLAIMER),
});

export type ReviewClaim = z.infer<typeof reviewClaimSchema>;
export type GeneratedArticle = z.infer<typeof generatedArticleSchema>;
