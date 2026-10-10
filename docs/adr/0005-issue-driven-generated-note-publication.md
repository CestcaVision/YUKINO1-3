# Automatically publish clearly attributed Issue-driven learning notes

The website is now a personal learning and work space rather than an admissions
pitch. The owner wants to maintain its learning notebook by opening or editing
GitHub Issues labelled `notes` plus one subject label. MiMo expands the Issue into
an explanation and the website updates through CI and GitHub Pages.

For this workflow, this decision supersedes ADR 0001's PR approval requirement
and extends ADR 0002's separation of generated content from student authorship.
It does not change human review requirements for Academic Results or the
meaning of student-authored content.

An open Issue written by an owner, member, or collaborator with the required
labels authorizes automatic generation and publication. The workflow reads the
latest Issue, generates a validated Markdown file with a stable Issue-based
slug, and commits it to the default branch. Updating the source updates the same
file; its original publication date is retained. Identical source material does
not cause another model call.

Generated explanations live in the Notes collection with
`authorship: ai-generated`, a source Issue URL, a source hash, and the model name.
The list and article identify generated content. It is not evidence of the
student's independent writing or understanding.

The workflow builds content before committing, then explicitly dispatches CI.
Only a successful production validation deploys to Pages. A failed CI run leaves
the live site at its previous deployment; the generated source commit remains
available for correction. Retrying an unchanged Issue can dispatch CI without
calling MiMo again.

This trades a review step for a simpler publishing flow. Automated content checks
validate structure and rendering, not mathematical correctness. The owner can
correct an explanation by editing the Issue or the resulting note. Credentials
remain in GitHub Actions Secrets and are never part of public site content.
