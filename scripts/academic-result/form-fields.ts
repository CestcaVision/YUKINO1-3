// The heading text GitHub renders for each Issue Form field (its `attributes.label`).
// Must stay byte-for-byte identical to the labels in
// .github/ISSUE_TEMPLATE/academic-result.yml, in the same order.
export const FORM_FIELDS = [
  { heading: "Qualification", key: "qualification" },
  { heading: "Subject", key: "subject" },
  { heading: "Result", key: "result" },
  { heading: "Predicted or achieved?", key: "status" },
  { heading: "Awarding body", key: "awardingBody" },
  { heading: "Examination session", key: "examinationSession" },
  { heading: "Evidence checked?", key: "evidenceChecked" },
  { heading: "Effective date (YYYY-MM-DD)", key: "effectiveDate" },
] as const;

export type FormFieldKey = (typeof FORM_FIELDS)[number]["key"];
