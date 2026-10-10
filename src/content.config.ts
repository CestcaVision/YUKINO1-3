import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
export const workMedia = [
  "Web experience",
  "Command-line program",
  "3D animation",
  "Interactive application",
] as const;
export const workCategories = [
  "Interactive systems",
  "Computational investigations",
  "Visual explanations",
] as const;
export const workInteractions = [
  "sorting-bars",
  "correlation-experiment",
] as const;

const notes = defineCollection({
  loader: glob({
    base: process.env.NOTE_CONTENT_DIRECTORY ?? "./src/content/notes",
    pattern: "**/*.md",
  }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a stable kebab-case slug"),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      lifecycle: z.enum(["draft", "review", "published"]),
      subject: z.enum(noteSubjects),
      media: z.array(z.enum(noteMedia)).min(1),
      capabilities: z.array(z.enum(noteCapabilities)).min(1),
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
    })
    .refine(
      (data) =>
        data.authorship !== "ai-generated" ||
        Boolean(data.sourceIssue && data.sourceHash && data.generationModel),
      {
        message:
          "AI-generated notes require sourceIssue, sourceHash, and generationModel",
        path: ["authorship"],
      },
    )
    .refine((data) => !data.updated || data.updated >= data.date, {
      message: "updated must not be before date",
      path: ["updated"],
    }),
});

const works = defineCollection({
  loader: glob({
    base: process.env.WORK_CONTENT_DIRECTORY ?? "./src/content/works",
    pattern: "**/*.md",
  }),
  schema: z
    .object({
      title: z.string().trim().min(1),
      summary: z.string().trim().min(1),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a stable kebab-case slug"),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      lifecycle: z.enum(["draft", "review", "published"]),
      subject: z.enum(noteSubjects),
      category: z.enum(workCategories),
      media: z.array(z.enum(workMedia)).min(1),
      capabilities: z.array(z.enum(noteCapabilities)).min(1),
      contribution: z.string().trim().min(1),
      interaction: z.enum(workInteractions).optional(),
      evidence: z.object({
        problem: z.string().trim().min(1),
        hypothesis: z.string().trim().min(1),
        process: z.string().trim().min(1),
        decisions: z.string().trim().min(1),
        outcome: z.string().trim().min(1),
        validation: z.string().trim().min(1),
        limitations: z.string().trim().min(1),
      }),
    })
    .refine((data) => !data.updated || data.updated >= data.date, {
      message: "updated must not be before date",
      path: ["updated"],
    }),
});

const academicResultLoader = glob({
  base: pathToFileURL(
    resolve(
      process.env.ACADEMIC_RESULT_CONTENT_DIRECTORY ??
        "./src/content/academic-results",
    ) + "/",
  ),
  pattern: "**/*.md",
});

const academicResults = defineCollection({
  loader: {
    ...academicResultLoader,
    load: async (context) => {
      // glob returns early for an empty directory; never retain removed results.
      context.store.clear();
      await academicResultLoader.load(context);
    },
  },
  schema: z.object({
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
  }),
});

const milestoneLoader = glob({
  base: process.env.MILESTONE_CONTENT_DIRECTORY ?? "./src/content/milestones",
  pattern: "**/*.md",
});
const milestones = defineCollection({
  loader: {
    ...milestoneLoader,
    load: async (context) => {
      context.store.clear();
      await milestoneLoader.load(context);
    },
  },
  schema: z.object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    date: z.coerce.date(),
    lifecycle: z.enum(["draft", "review", "published"]),
  }),
});

export const collections = { notes, works, academicResults, milestones };
