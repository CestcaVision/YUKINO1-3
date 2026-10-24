import {
  academicResultSchema,
  type AcademicResult,
} from "../../src/schemas/academic-result.ts";
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

function coerceYesNo(raw: string): boolean | undefined {
  const value = raw.trim().toLowerCase();
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

export type IssueFormResult =
  | { success: true; data: AcademicResult }
  | { success: false; errors: string[] };

/**
 * Validates parsed Issue Form fields against the Academic Result schema.
 * `public` is not collected on the form: the workflow that runs this script
 * only accepts triggers from an authorized actor (see authorize.ts), and the
 * pull request it opens is the human review gate required by ADR 0001, so a
 * ready result is always publishable pending that review.
 */
export function buildAcademicResultCandidate(
  fields: Record<string, string>,
): IssueFormResult {
  const errors: string[] = [];

  // Every one of this form's fields renders as a single-line input or a
  // fixed dropdown, so a real submission can never contain a raw newline.
  // Reject rather than silently truncate one that does (e.g. an issue
  // created directly via the API instead of through the form UI).
  for (const { heading } of FORM_FIELDS) {
    if ((fields[heading] ?? "").includes("\n")) {
      errors.push(`"${heading}" must be a single line.`);
    }
  }

  const statusRaw = field(fields, "status").toLowerCase();
  if (statusRaw !== "achieved" && statusRaw !== "predicted") {
    errors.push(
      `"${HEADING.status}" must be "achieved" or "predicted" (got ${JSON.stringify(field(fields, "status"))}).`,
    );
  }

  const evidenceChecked = coerceYesNo(field(fields, "evidenceChecked"));
  if (evidenceChecked === undefined) {
    errors.push(
      `"${HEADING.evidenceChecked}" must be "Yes" or "No" (got ${JSON.stringify(field(fields, "evidenceChecked"))}).`,
    );
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const subject = field(fields, "subject");
  const candidate = {
    qualification: field(fields, "qualification"),
    ...(subject ? { subject } : {}),
    result: field(fields, "result"),
    status: statusRaw as "achieved" | "predicted",
    awardingBody: field(fields, "awardingBody"),
    examinationSession: field(fields, "examinationSession"),
    evidenceChecked: evidenceChecked as boolean,
    effectiveDate: field(fields, "effectiveDate"),
    public: true,
  };

  const parsed = academicResultSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(value)"}: ${issue.message}`,
      ),
    };
  }

  return { success: true, data: parsed.data };
}
