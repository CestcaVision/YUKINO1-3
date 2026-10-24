# Optional AI review experiment

An optional, vendor-agnostic AI review can run after a Draft Note pull
request is opened by the Note automation (`docs/notes-automation.md`). It
never affects deterministic classification or the site build, and it is
disabled entirely unless explicitly configured. Per ADR 0002, anything the
model freely generates or substantially rewrites is modeled as a **Generated
Article**, never as Note content or admissions evidence.

## Provider boundary

`src/ai/provider.ts` defines the only interface this project depends on:

```ts
interface AiProvider {
  readonly name: string;
  review(input: DraftNoteReviewInput): Promise<AiReviewOutput>;
}
```

`scripts/ai-review/provider-factory.ts` maps a configured provider name to a
concrete adapter. **No vendor is implemented yet** — provider, model,
budget, and credentials remain external configuration to be supplied later,
per the project spec. Adding a real adapter only touches that one factory
file; nothing else depends on a vendor SDK or API shape.

## Configuration

All configuration is environment-driven (`src/ai/config.ts`); nothing is
hardcoded:

| Variable | Meaning |
| --- | --- |
| `AI_PROVIDER` | Provider name. Unset disables the feature entirely. |
| `AI_API_KEY` | Credential. Unset disables the feature entirely. |
| `AI_MODEL` | Model identifier. Defaults to `"default"`. |
| `AI_MAX_CALLS_PER_RUN` | Per-workflow-run call limit. Defaults to 1. |
| `AI_MAX_CALLS_PER_PERIOD` | Rolling monthly call limit. Defaults to 20. |

When `AI_PROVIDER` or `AI_API_KEY` is missing, `loadAiConfig` returns `null`
and the optional review reports `status: "disabled"` — the Note workflow,
classification, and site build all continue to succeed unaffected.

## Usage limits

`src/ai/usage-limiter.ts` enforces both limits before any provider call is
made:

- **Per-run**: at most `AI_MAX_CALLS_PER_RUN` calls within one workflow run.
- **Monthly**: at most `AI_MAX_CALLS_PER_PERIOD` calls within a rolling
  calendar month, persisted across runs in `.ai-review/usage.json` (restored
  and saved via `actions/cache` in `.github/workflows/note.yml`).

Once either limit is reached, `runOptionalAiReview` returns
`status: "limited"` **without calling the provider** — no partial or
degraded public content is ever produced.

## Review output and claims

A successful review reports every claim the model added or corrected as
`{ before, after, rationale }` — the text before the model's edit (or `""`
for a newly added claim), the text after, and the model's stated reason.
This is written to `ai-review-output/review.md`, a private CI artifact.

## Generated Articles

If the model's output includes `generatedArticleBody` — meaning it freely
generated or substantially rewrote the explanation rather than only
annotating the applicant's own text — that becomes a **Generated Article**
(`src/ai/generated-article.ts`), written to
`ai-review-output/generated-article.json`. A Generated Article:

- Is **never** an Astro content collection entry: `generatedArticleSchema`
  is intentionally not registered in `src/content.config.ts`, so it can
  never appear in the Notes index, Featured Work, Capability evidence,
  sitemap, RSS feed, or any production build output.
- Always carries a fixed disclaimer identifying it as AI-generated and not
  applicant evidence.
- Exists only as a workflow artifact uploaded by the `ai-review` job in
  `.github/workflows/note.yml`, gated behind a GitHub `ai-review`
  Environment so the repository owner can require reviewer approval and
  scope the `AI_API_KEY` secret to that environment alone.

**Residual limitation**: GitHub Actions artifacts on a public repository are
downloadable by anyone with read access to the repository's Actions runs.
The `ai-review` Environment approval gate and minimal `contents: read`
permission reduce who can *trigger* a run and what it can *do*, but they do
not change repository-level artifact visibility. Treating this artifact as
genuinely private requires either a private repository or restricting who
can read the repository's Actions runs — this is a platform constraint, not
something this workflow can override.

## Untrusted data

Issue input, prompts, and model output are all treated as untrusted text:

- Nothing here is ever executed (`eval`, `Function`, dynamic `import`, or
  shelling out to interpret output) — it is only stored as string data.
- `src/ai/redact.ts` strips any configured credential, plus generically
  API-key-shaped substrings, from every claim, article body, and error
  message before it is written to a file or a log.

## Testing

`tests/unit/ai-provider-contract.test.ts` covers: swapping in a fake
provider, missing configuration disabling the feature cleanly, both usage
limits stopping calls with no partial output, secret redaction, and that
Generated Articles never register as a content collection.
