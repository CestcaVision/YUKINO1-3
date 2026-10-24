// The heading text GitHub renders for each Issue Form field (its `attributes.label`).
// Must stay byte-for-byte identical to the labels in
// .github/ISSUE_TEMPLATE/source-brief.yml, in the same order.
export const FORM_FIELDS = [
  { heading: "Title", key: "title" },
  { heading: "Your question", key: "question" },
  { heading: "Your own preliminary explanation", key: "explanation" },
  { heading: "Example or derivation", key: "example" },
  { heading: "Uncertainties", key: "uncertainties" },
  { heading: "Requested assistance", key: "assistance" },
  { heading: "Allowed source scope", key: "allowedSources" },
] as const;

export type FormFieldKey = (typeof FORM_FIELDS)[number]["key"];
