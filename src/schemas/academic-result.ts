import { z } from "astro/zod";

// Shared by the content collection (src/content.config.ts) and the
// Academic Result issue automation (scripts/academic-result/) so both
// enforce exactly the same rules.
export const academicResultSchema = z.object({
  qualification: z.string().trim().min(1),
  subject: z.string().trim().min(1).optional(),
  result: z
    .string()
    .trim()
    .min(1)
    .refine(
      (value) => !/^(pending|tbd|tbc|n\/?a|[-–—]+)$/i.test(value),
      "Record a real grade or score, not a placeholder",
    ),
  status: z.enum(["predicted", "achieved"]),
  awardingBody: z.string().trim().min(1),
  examinationSession: z.string().trim().min(1),
  evidenceChecked: z.boolean(),
  effectiveDate: z.iso.date(),
  public: z.boolean(),
});

export type AcademicResult = z.infer<typeof academicResultSchema>;
