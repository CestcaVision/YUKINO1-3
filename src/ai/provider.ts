export interface SourceBriefText {
  title: string;
  question: string;
  explanation: string;
  example: string;
  uncertainties: string;
  assistance: string;
  allowedSources: string;
}

export interface DraftNoteReviewInput {
  sourceBrief: SourceBriefText;
  /** The deterministic Draft Note body produced by the Note automation. */
  draftNoteBody: string;
}

export interface ReviewClaim {
  /** The applicant's original text this claim touches, or "" if newly added. */
  before: string;
  after: string;
  rationale: string;
}

export interface AiReviewOutput {
  /** Every claim the model added or corrected, each with before/after/rationale. */
  claims: ReviewClaim[];
  /**
   * Present only when the model freely generated or substantially rewrote
   * the explanation rather than only annotating the applicant's own text.
   * This is modeled as a Generated Article (see src/ai/generated-article.ts)
   * per ADR 0002 — it is never treated as Note content.
   */
  generatedArticleBody?: string;
}

/**
 * Vendor-agnostic boundary for the optional AI review experiment. A
 * concrete provider adapter (chosen later, per project spec) implements
 * this; nothing outside src/ai/ and scripts/ai-review/ should depend on any
 * specific vendor SDK or API shape.
 */
export interface AiProvider {
  readonly name: string;
  review(input: DraftNoteReviewInput): Promise<AiReviewOutput>;
}
