import {
  noteCapabilities,
  noteMedia,
  noteSubjects,
} from "../../src/schemas/note.ts";

type NoteSubject = (typeof noteSubjects)[number];
type NoteMedium = (typeof noteMedia)[number];
type NoteCapability = (typeof noteCapabilities)[number];

// Deterministic keyword matching only: every label the classifier can ever
// produce comes from these controlled vocabularies (src/schemas/note.ts).
// It never invents a label, and no generative AI is involved.
const SUBJECT_KEYWORDS: Record<NoteSubject, readonly string[]> = {
  Mathematics: [
    "mathematics",
    "math",
    "algebra",
    "calculus",
    "geometry",
    "equation",
    "derivative",
    "integral",
    "vector",
    "matrix",
    "proof",
    "theorem",
    "trigonometry",
    "polynomial",
  ],
  Economics: [
    "economics",
    "economic",
    "market",
    "supply",
    "demand",
    "inflation",
    "gdp",
    "microeconomic",
    "macroeconomic",
    "elasticity",
    "opportunity cost",
    "trade",
  ],
  Physics: [
    "physics",
    "newton",
    "velocity",
    "acceleration",
    "momentum",
    "mechanics",
    "friction",
    "gravity",
    "kinematics",
    "reference frame",
  ],
  "Computer Science": [
    "algorithm",
    "sorting",
    "recursion",
    "data structure",
    "complexity",
    "computer science",
    "programming",
    "big o",
    "invariant",
  ],
};

const MEDIUM_KEYWORDS: Record<NoteMedium, readonly string[]> = {
  "Written explanation": [
    "explain",
    "explanation",
    "essay",
    "derive",
    "derivation",
    "proof",
    "describe",
  ],
  Code: [
    "code",
    "program",
    "script",
    "function",
    "algorithm",
    "python",
    "javascript",
    "typescript",
    "implementation",
  ],
  "Interactive demonstration": [
    "interactive",
    "demo",
    "demonstration",
    "simulation",
    "visualiser",
    "visualizer",
    "animation",
  ],
};

const CAPABILITY_KEYWORDS: Record<NoteCapability, readonly string[]> = {
  "Explains a mathematical idea": [
    "mathematical idea",
    "theorem",
    "proof",
    "derive",
    "derivation",
    "concept",
    "definition",
  ],
  "Builds a computational model": [
    "model",
    "simulate",
    "simulation",
    "algorithm",
    "program",
    "code",
  ],
  "Interprets evidence": [
    "data",
    "evidence",
    "result",
    "graph",
    "analysis",
    "interpret",
    "experiment",
    "observation",
  ],
};

function countMatches(text: string, keywords: readonly string[]): number {
  return keywords.reduce(
    (count, keyword) => (text.includes(keyword) ? count + 1 : count),
    0,
  );
}

export interface SourceBriefText {
  question: string;
  explanation: string;
  example: string;
  uncertainties: string;
  assistance: string;
}

export interface ClassificationResult {
  status: "confirmed" | "pending";
  subject?: NoteSubject;
  media?: NoteMedium[];
  capabilities?: NoteCapability[];
  /** Human-readable reasons for a "pending" status, for the pull request body. */
  reasons: string[];
}

/**
 * Recommends Subject, Medium, and Capability labels for a Source Brief using
 * deterministic keyword matching against the controlled vocabularies only.
 * When the recommendation is not confident — no keyword match, or a tie
 * between Subjects — the corresponding field is left undefined and the
 * overall status is "pending" rather than silently picking a label.
 */
export function classifySourceBrief(
  input: SourceBriefText,
): ClassificationResult {
  const text = [
    input.question,
    input.explanation,
    input.example,
    input.uncertainties,
    input.assistance,
  ]
    .join("\n")
    .toLowerCase();

  const subjectScores = (
    Object.entries(SUBJECT_KEYWORDS) as [NoteSubject, readonly string[]][]
  ).map(
    ([subject, keywords]) => [subject, countMatches(text, keywords)] as const,
  );
  const topSubjectScore = Math.max(...subjectScores.map(([, score]) => score));
  const topSubjects = subjectScores
    .filter(([, score]) => score === topSubjectScore && score > 0)
    .map(([subject]) => subject);
  const subject = topSubjects.length === 1 ? topSubjects[0] : undefined;

  const media = (
    Object.entries(MEDIUM_KEYWORDS) as [NoteMedium, readonly string[]][]
  )
    .filter(([, keywords]) => countMatches(text, keywords) > 0)
    .map(([medium]) => medium);

  const capabilities = (
    Object.entries(CAPABILITY_KEYWORDS) as [NoteCapability, readonly string[]][]
  )
    .filter(([, keywords]) => countMatches(text, keywords) > 0)
    .map(([capability]) => capability);

  const reasons: string[] = [];
  if (!subject) {
    reasons.push(
      topSubjects.length > 1
        ? `Subject is ambiguous between ${topSubjects.join(" and ")}.`
        : "No controlled Subject keyword was matched.",
    );
  }
  if (media.length === 0) {
    reasons.push("No controlled Medium keyword was matched.");
  }
  if (capabilities.length === 0) {
    reasons.push("No controlled Capability keyword was matched.");
  }

  const status =
    subject && media.length > 0 && capabilities.length > 0
      ? "confirmed"
      : "pending";

  return {
    status,
    subject,
    media: media.length > 0 ? media : undefined,
    capabilities: capabilities.length > 0 ? capabilities : undefined,
    reasons,
  };
}
