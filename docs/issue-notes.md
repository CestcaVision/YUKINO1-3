# Publishing learning notes with GitHub Issues

The student opens an Issue with a topic and source material. MiMo expands it into
a learning note, commits the generated Markdown, and explicitly starts CI. The
site deploys only after the existing checks pass.

## Configure the student's repository

Merge these workflow changes into the default branch of
`YUKINO1-3/YUKINO1-3.github.io`. A workflow on a local branch or only in the fork
will not publish the student's website.

1. In **Settings → Environments**, create an environment named `MIMO`. Add
   the Environment secret `MIMO_API_KEY` containing the student's MiMo Token Plan API key. Do not put the
   key in Issues, committed files, or browser code.
2. The default model is `mimo-v2.6-flash` and the default base URL is
   `https://token-plan-cn.xiaomimimo.com/v1`. To change them, set repository
   Variables `MIMO_MODEL` and `MIMO_BASE_URL`. The URL includes `/v1`, not
   `/chat/completions`. This workflow uses MiMo JSON mode.
3. Enable GitHub Actions if disabled. The workflow requests `contents: write`,
   `issues: read`, and `actions: write`. Repository or organization policies must
   allow these permissions. Default-branch rules must allow the workflow's
   content commits; a branch requiring PRs without a suitable bypass cannot
   use this direct-publishing flow.
4. In **Settings → Pages**, set the build source to **GitHub Actions**. A
   `github-pages` environment requiring manual approval still requires that
   approval before publishing; remove that requirement if full automation is
   intended. The build reads the configured Pages URL automatically, including
   a fork’s project path or custom domain. For a local deployment build, set
   `SITE_URL` to that full URL.
5. Create the labels `notes`, `math`, `cs`, `physics`, `economics`, and `english` before using
   the Issue forms. Issue forms do not create missing labels.

For example, a maintainer can create the labels with:

```bash
gh label create notes --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'Publish a learning note' --force
gh label create math --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'Mathematics' --force
gh label create cs --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'Computer Science' --force
gh label create physics --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'Physics' --force
gh label create economics --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'Economics' --force
gh label create english --repo YUKINO1-3/YUKINO1-3.github.io --color 1e4ed8 --description 'English' --force
```

The API request format, Token Plan URL, and JSON mode follow the
[MiMo first-call documentation](https://mimo.mi.com/docs/zh-CN/quick-start/summary/first-api-call)
and [MiMo structured-output documentation](https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/text-generation/structured-output).

## Publish a note

Use the mathematics, computer science, physics, economics, or English Issue form. Its
labels are applied automatically when they exist. Write a specific title and
explain the question, known concepts, examples, confusion, and any source links.
The note uses the language of the Issue.

Alternatively, create a normal Issue and apply the actual GitHub labels:

| Labels | Subject |
| --- | --- |
| `notes` + `math` | Mathematics |
| `notes` + `cs` | Computer Science |
| `notes` + `physics` | Physics |
| `notes` + `economics` | Economics |
| `notes` + `english` | English |

Writing `#notes #math` in the title or body is not enough. Exactly one subject
label is required. Only Issues authored by repository owners, members, or
collaborators can trigger publication. Public visitors' Issues do not call MiMo.

In **Actions**, first watch **Publish learning note from Issue**, then **CI**.
Successful generation creates `src/content/notes/issue-N.md`. Its URL is
`/notes/issue-N/`, where `N` is the Issue number. Generated notes appear in Notes,
the homepage, and RSS. Their list entries and detail pages identify AI-generated
content; the detail page links to the original Issue and names the model.

Edit the Issue to update the same note. Applying a label or reopening the Issue
can also trigger the workflow. Changing the source or model regenerates the note;
unchanged retries avoid an additional model call. Closing an Issue or removing a
label stops future generation and does not remove an existing published note.

If editing the generated Markdown directly, its `sourceHash` remains unchanged,
so unrelated triggers do not overwrite the edit. Editing the source Issue causes
generation to replace that automated note again. For full manual ownership,
rename its file and slug before deleting the source Issue's `notes` label.

## Failure and retry behaviour

- Missing API key, rate limits, network errors, truncated responses, unsupported
  HTML, or invalid metadata fail before the generated content is committed.
- A failed model request leaves an existing note unchanged. Rerun that failed
  Actions run after correcting the configuration or Issue.
- CI failure blocks deployment. The last successful website stays live. Correct
  the source Issue, or run **CI → Run workflow** on `main` after fixing the code.
- A rerun after a successful commit dispatches CI even if the source is unchanged.
  It does not call the model again for the same source.
- Files use fixed Issue-based names. Model output cannot choose a filesystem path,
  a lifecycle, or deploy commands, and cannot overwrite a student-authored file.

The model expands the supplied text; this workflow does not browse reference
links. Content validation does not prove the explanation is correct. Read and
correct published notes as part of maintaining the notebook.

## Local verification

```bash
pnpm test:unit
pnpm lint
pnpm build
pnpm test:e2e
```

The generation tests use simulated API responses and do not spend MiMo credits.
Real generation and GitHub Pages deployment require repository configuration and
a real Issue after the workflow is installed on the default branch.
