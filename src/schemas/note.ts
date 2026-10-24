import { z } from "astro/zod";

// Shared by the content collection (src/content.config.ts) and the Note
// issue automation (scripts/note/) so both enforce exactly the same rules.
export const noteSubjects = [
  "Mathematics",
  "Economics",
  "Physics",
  "Computer Science",
  "English",
] as const;
export const noteMedia = [
  "Written explanation",
  "Code",
  "Interactive demonstration",
] as const;
export const noteCapabilities = [
  "Explains a mathematical idea",
  "Explains a language concept",
  "Builds a computational model",
  "Interprets evidence",
] as const;

/**
 * A Note's classification is "confirmed" only once Subject, Medium, and
 * Capability are all set from the controlled vocabulary above. Automation
 * that cannot confidently classify a Draft Note leaves it "pending" instead
 * of silently guessing a controlled label — a published Note may never be
 * "pending".
 */
export const noteSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a stable kebab-case slug"),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    lifecycle: z.enum(["draft", "review", "published"]),
    authorship: z.enum(["student", "ai-generated"]).default("student"),
    sourceIssue: z
      .string()
      .regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/[1-9]\d*$/)
      .optional(),
    sourceHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    generationModel: z.string().trim().min(1).optional(),
    classification: z.enum(["confirmed", "pending"]).default("confirmed"),
    subject: z.enum(noteSubjects).optional(),
    media: z.array(z.enum(noteMedia)).min(1).optional(),
    capabilities: z.array(z.enum(noteCapabilities)).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.authorship === "ai-generated" &&
      !(data.sourceIssue && data.sourceHash && data.generationModel)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "AI-generated notes require sourceIssue, sourceHash, and generationModel",
        path: ["authorship"],
      });
    }
    if (data.updated && data.updated < data.date) {
      ctx.addIssue({
        code: "custom",
        message: "updated must not be before date",
        path: ["updated"],
      });
    }

    const fullyClassified =
      data.subject !== undefined &&
      data.media !== undefined &&
      data.capabilities !== undefined;

    if (data.classification === "confirmed" && !fullyClassified) {
      ctx.addIssue({
        code: "custom",
        message:
          "a confirmed classification requires subject, media, and capabilities",
        path: ["classification"],
      });
    }

    if (
      data.lifecycle === "published" &&
      (data.classification !== "confirmed" || !fullyClassified)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "a published Note requires a confirmed Subject, Medium, and Capability classification",
        path: ["lifecycle"],
      });
    }
  });

export type Note = z.infer<typeof noteSchema>;
