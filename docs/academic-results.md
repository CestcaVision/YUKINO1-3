# Maintaining Academic Results

Record actual achieved or officially predicted Academic Results as Markdown files
in `src/content/academic-results/`, with the fields below in YAML frontmatter.
Do not add sample scores to the production collection. An empty collection is valid.

| Field | Value |
| --- | --- |
| `qualification` | Non-empty qualification name |
| `subject` | Optional non-empty subject; omit for an overall result |
| `result` | Non-empty actual grade or score, never a placeholder |
| `status` | `achieved` or `predicted` (official predictions only) |
| `awardingBody` | Non-empty awarding body |
| `examinationSession` | Non-empty examination session, including year |
| `evidenceChecked` | Boolean recording whether the supporting evidence was checked |
| `effectiveDate` | Quoted calendar date in `YYYY-MM-DD` format |
| `public` | Boolean recording explicit permission to publish |

All fields except `subject` are required, including for non-public records.
Only records with both `evidenceChecked: true` and `public: true` are rendered.
About lists all eligible records, newest effective date first. The homepage
focuses on personal learning, Notes, and Works and does not display Academic
Results. Predictions on About are labelled “Officially predicted”; completed
results are labelled “Achieved”. With no eligible records, About states that no
verified results are published yet.

Keep supporting evidence outside this public repository. The flags record a human
review, not an automated verification. Files committed to a public repository are
public even when excluded from the rendered website. Do not commit confidential
records or evidence. Changes still require applicant review before publication,
as specified in ADR 0001.

Current study belongs in `src/data/current-study.json`, a separate array of subject
names. Leave it empty until confirmed. It appears only as “Current study” on About
and never creates an Academic Result or a predicted score.

## Adding a result through the Academic Result issue form

Repository owners (or an actor explicitly listed in the `ACADEMIC_RESULT_APPROVED_ACTORS`
repository variable) can open an "Academic Result" issue instead of committing a file by
hand. The `academic-result.yml` workflow (`.github/workflows/academic-result.yml`):

- Rejects the request outright, with no content change, unless the actor is the owner
  or an approved actor.
- Deterministically parses the Issue Form fields with
  `scripts/academic-result/issue-form.ts` and validates them against the same schema as
  `src/content.config.ts` (`src/schemas/academic-result.ts`) — no generative AI is used.
- On success, opens a pull request adding a single `src/content/academic-results/issue-<N>.md`
  file on branch `academic-result/issue-<N>`. It never commits to `main` directly;
  merging the pull request is the human approval required by ADR 0001.
- On failure (unauthorized, invalid, or incomplete), posts an actionable comment on the
  issue and changes nothing.
- Is idempotent: a redelivered webhook or a rerun looks up any pull request already
  associated with the issue's deterministic branch name and skips creating a competitor.

The form does not collect `public`: a result it generates is always `public: true`, since
only an approved actor can trigger the workflow, and the required pull request review
before merge is the human approval gate, per ADR 0001.
