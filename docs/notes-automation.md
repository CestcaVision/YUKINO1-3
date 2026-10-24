# Maintaining Notes

Notes are Markdown files in `src/content/notes/`, validated against
`src/schemas/note.ts`, with the fields below in YAML frontmatter.

| Field | Value |
| --- | --- |
| `title` | Non-empty title. May change without changing the stable `slug`. |
| `summary` | Non-empty short summary. |
| `slug` | Stable kebab-case address. Does not change when `title` changes. |
| `date` | Publish date. |
| `updated` | Optional; must not be earlier than `date`. |
| `lifecycle` | `draft`, `review`, or `published`. Only `published` Notes appear in production. |
| `classification` | `confirmed` or `pending`. Defaults to `confirmed`. |
| `subject` | One controlled Subject. Required when `classification` is `confirmed`. |
| `media` | One or more controlled Medium values. Required when `classification` is `confirmed`. |
| `capabilities` | One or more controlled Capability values. Required when `classification` is `confirmed`. |

A Note can only be `lifecycle: published` when its classification is `confirmed`
and `subject`, `media`, and `capabilities` are all set — the schema build fails
otherwise. A `draft` or `review` Note may leave classification `pending` while
it awaits confirmation.

## Submitting a Source Brief through the issue form

Repository owners (or an actor explicitly listed in the `NOTE_APPROVED_ACTORS`
repository variable) can open a "Source Brief" issue to start a new Note. The
`note.yml` workflow (`.github/workflows/note.yml`):

- Rejects the request outright, with no content change, unless the actor is the
  owner or an approved actor.
- Deterministically parses the Issue Form fields with
  `scripts/note/issue-form.ts` and rejects a Source Brief missing the
  applicant's own minimum content (question, preliminary explanation, example
  or derivation, uncertainties, requested assistance, and allowed source
  scope), reporting exactly what is missing.
- Recommends Subject, Medium, and Capability using deterministic keyword
  matching against the controlled vocabulary only
  (`scripts/note/classify.ts`) — it never invents a label and never calls a
  generative AI service. When the recommendation is not confident (no
  keyword match, or an ambiguous tie between Subjects), the corresponding
  field is left unset and `classification: pending` is recorded instead of
  silently guessing.
- On success, opens a pull request adding a single
  `src/content/notes/issue-<N>.md` Draft Note (`lifecycle: review`) on branch
  `note/issue-<N>`, with the Source Brief's own sections carried into the
  Note body. It never commits to `main` directly; reviewing the recommended
  classification, setting `lifecycle: published`, and merging the pull
  request is the human approval required by ADR 0001.
- On failure (unauthorized, invalid, or incomplete), posts an actionable
  comment on the issue and changes nothing.
- Is idempotent: a redelivered webhook or a rerun looks up any pull request
  already associated with the issue's deterministic branch name and skips
  creating a competitor.

An optional, separate AI review experiment can run against a Draft Note's
pull request — see `docs/ai-review.md`. It never affects this workflow's
deterministic classification, and it is disabled entirely without configured
credentials.
