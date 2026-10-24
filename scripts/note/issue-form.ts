import { parseIssueFormBody as parseKnownHeadings } from "../shared/issue-form-parser.ts";
import { FORM_FIELDS, type FormFieldKey } from "./form-fields.ts";

const HEADING = Object.fromEntries(
  FORM_FIELDS.map(({ heading, key }) => [key, heading]),
) as Record<FormFieldKey, string>;

const KNOWN_HEADINGS = FORM_FIELDS.map((f) => f.heading);

export function parseIssueFormBody(body: string): Record<string, string> {
  return parseKnownHeadings(body, KNOWN_HEADINGS);
}

function field(fields: Record<string, string>, key: FormFieldKey): string {
  return (fields[HEADING[key]] ?? "").trim();
}

// The minimum amount of the applicant's own material each field must
// contain. These are deliberately low: the point is to reject an empty or
// placeholder Source Brief, not to judge writing quality.
const MIN_LENGTH: Record<Exclude<FormFieldKey, "title">, number> = {
  question: 10,
  explanation: 30,
  example: 10,
  uncertainties: 5,
  assistance: 3,
  allowedSources: 3,
};

export interface SourceBrief {
  title: string;
  question: string;
  explanation: string;
  example: string;
  uncertainties: string;
  assistance: string;
  allowedSources: string;
}

export type IssueFormResult =
  { success: true; data: SourceBrief } | { success: false; errors: string[] };

/**
 * Validates that a parsed Issue Form carries the applicant's own minimum
 * Source Brief content. Every field here is the applicant's own material —
 * this function never generates or infers text, it only rejects a
 * submission that is missing, empty, or a trivial placeholder.
 */
export function buildSourceBriefCandidate(
  fields: Record<string, string>,
): IssueFormResult {
  const errors: string[] = [];

  const title = field(fields, "title");
  if (title.length === 0) {
    errors.push(`"${HEADING.title}" is required.`);
  } else if (title.includes("\n")) {
    // The Issue Form renders this as a single-line `input`, so a real
    // submission can never contain a newline. An issue created directly via
    // the API (bypassing that UI constraint) could still supply one, and it
    // would otherwise flow unchecked into the pull request title.
    errors.push(`"${HEADING.title}" must be a single line.`);
  }

  for (const [key, minLength] of Object.entries(MIN_LENGTH) as [
    Exclude<FormFieldKey, "title">,
    number,
  ][]) {
    const value = field(fields, key);
    if (value.length < minLength) {
      errors.push(
        `"${HEADING[key]}" needs at least ${minLength} characters of your own material (got ${value.length}).`,
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title: field(fields, "title"),
      question: field(fields, "question"),
      explanation: field(fields, "explanation"),
      example: field(fields, "example"),
      uncertainties: field(fields, "uncertainties"),
      assistance: field(fields, "assistance"),
      allowedSources: field(fields, "allowedSources"),
    },
  };
}
