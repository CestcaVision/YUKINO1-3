import { describe, expect, it } from "vitest";
import { loadAiConfig } from "../../src/ai/config.ts";
import { generatedArticleSchema } from "../../src/ai/generated-article.ts";
import type {
  AiProvider,
  DraftNoteReviewInput,
} from "../../src/ai/provider.ts";
import { redactSecrets } from "../../src/ai/redact.ts";
import { checkUsage, type UsageRecord } from "../../src/ai/usage-limiter.ts";
import { runOptionalAiReview } from "../../scripts/ai-review/run-review.ts";
import { createProvider } from "../../scripts/ai-review/provider-factory.ts";
import { collections } from "../../src/content.config.ts";

const sampleInput: DraftNoteReviewInput = {
  sourceBrief: {
    title: "Why does completing the square work?",
    question: "Why does it find the vertex?",
    explanation: "My own explanation of the algebra.",
    example: "x^2 + 6x + 5 -> (x+3)^2 - 4",
    uncertainties: "Not sure about the general case.",
    assistance: "Please check my working.",
    allowedSources: "My own classroom notes only.",
  },
  draftNoteBody: "## Question\n\nWhy does it find the vertex?\n",
};

function fakeProvider(review: AiProvider["review"], name = "fake"): AiProvider {
  return { name, review };
}

describe("loadAiConfig", () => {
  it("is disabled (null) when no provider is configured", () => {
    expect(loadAiConfig({})).toBeNull();
  });

  it("is disabled (null) when a provider is named but no credential is set", () => {
    expect(loadAiConfig({ AI_PROVIDER: "acme" })).toBeNull();
  });

  it("is disabled (null) when a credential is set but no provider is named", () => {
    expect(loadAiConfig({ AI_API_KEY: "secret-value" })).toBeNull();
  });

  it("loads provider, model, and limits from the environment when fully configured", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "acme",
      AI_API_KEY: "secret-value",
      AI_MODEL: "acme-large",
      AI_MAX_CALLS_PER_RUN: "3",
      AI_MAX_CALLS_PER_PERIOD: "50",
    });
    expect(config).toEqual({
      provider: "acme",
      apiKey: "secret-value",
      model: "acme-large",
      maxCallsPerRun: 3,
      maxCallsPerPeriod: 50,
    });
  });

  it("never invents a provider, model, or budget beyond documented defaults", () => {
    const config = loadAiConfig({
      AI_PROVIDER: "acme",
      AI_API_KEY: "secret-value",
    });
    expect(config?.model).toBe("default");
    expect(config?.maxCallsPerRun).toBeGreaterThan(0);
    expect(config?.maxCallsPerPeriod).toBeGreaterThan(0);
  });
});

describe("checkUsage", () => {
  const limits = { maxCallsPerRun: 1, maxCallsPerPeriod: 2 };
  const now = new Date("2026-09-15T00:00:00Z");

  it("allows a call within both limits", () => {
    const result = checkUsage(null, limits, now, 0);
    expect(result.allowed).toBe(true);
    expect(result.record.callsThisPeriod).toBe(1);
  });

  it("stops calls once the per-run limit is reached", () => {
    const result = checkUsage(null, limits, now, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/per-run/);
  });

  it("stops calls once the monthly limit is reached", () => {
    const persisted: UsageRecord = { period: "2026-09", callsThisPeriod: 2 };
    const result = checkUsage(persisted, limits, now, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/monthly/);
  });

  it("rolls over to a fresh count in a new period", () => {
    const persisted: UsageRecord = { period: "2026-08", callsThisPeriod: 2 };
    const result = checkUsage(persisted, limits, now, 0);
    expect(result.allowed).toBe(true);
    expect(result.record.period).toBe("2026-09");
    expect(result.record.callsThisPeriod).toBe(1);
  });
});

describe("redactSecrets", () => {
  it("removes an exact configured secret from text", () => {
    expect(redactSecrets("the key is sk-abc123 ok", ["sk-abc123"])).toBe(
      "the key is [REDACTED] ok",
    );
  });

  it("removes a generic API-key-shaped token even without a configured secret", () => {
    const redacted = redactSecrets("leaked: sk-thisisalongtoken1234567890", []);
    expect(redacted).not.toContain("thisisalongtoken");
    expect(redacted).toContain("[REDACTED]");
  });

  it("tolerates undefined secrets in the list", () => {
    expect(() => redactSecrets("hello", [undefined])).not.toThrow();
  });
});

describe("runOptionalAiReview", () => {
  const now = new Date("2026-09-15T00:00:00Z");

  it("stops cleanly when no provider is configured, without touching site build or classification", async () => {
    const result = await runOptionalAiReview({
      config: null,
      provider: null,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: null,
      now,
    });
    expect(result.status).toBe("disabled");
  });

  it("calls a swapped-in provider and carries claims through with before/after/rationale", async () => {
    const provider = fakeProvider(async () => ({
      claims: [
        {
          before: "",
          after: "Completing the square finds the vertex form.",
          rationale: "Matches the standard algebraic identity.",
        },
      ],
    }));

    const result = await runOptionalAiReview({
      config: {
        provider: "fake",
        apiKey: "secret-value",
        model: "fake-model",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      },
      provider,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: null,
      now,
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.reviewMarkdown).toContain(
      "Matches the standard algebraic identity.",
    );
    expect(result.generatedArticle).toBeNull();
  });

  it("models freely generated or substantially rewritten output as a Generated Article, never as Note content", async () => {
    const provider = fakeProvider(async () => ({
      claims: [],
      generatedArticleBody: "A fully rewritten explanation of the topic.",
    }));

    const result = await runOptionalAiReview({
      config: {
        provider: "fake",
        apiKey: "secret-value",
        model: "fake-model",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      },
      provider,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: null,
      now,
    });

    expect(result.status).toBe("completed");
    if (result.status !== "completed") return;
    expect(result.generatedArticle).not.toBeNull();
    expect(
      generatedArticleSchema.safeParse(result.generatedArticle).success,
    ).toBe(true);
    expect(result.generatedArticle?.disclaimer).toContain("Not a Note");
  });

  it("stops calls once the usage limit is reached and produces no partial output", async () => {
    let calls = 0;
    const provider = fakeProvider(async () => {
      calls += 1;
      return { claims: [] };
    });

    const result = await runOptionalAiReview({
      config: {
        provider: "fake",
        apiKey: "secret-value",
        model: "fake-model",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      },
      provider,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: { period: "2026-09", callsThisPeriod: 20 },
      now,
    });

    expect(result.status).toBe("limited");
    expect(calls).toBe(0);
    expect(result).not.toHaveProperty("reviewMarkdown");
    expect(result).not.toHaveProperty("generatedArticle");
  });

  it("redacts the configured secret from a provider failure message rather than leaking it", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("auth failed for secret-value");
    });

    const result = await runOptionalAiReview({
      config: {
        provider: "fake",
        apiKey: "secret-value",
        model: "fake-model",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      },
      provider,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: null,
      now,
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.reason).not.toContain("secret-value");
  });

  it("still counts a failed call toward the usage record, so a persistently failing provider eventually trips the monthly limit", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("boom");
    });

    const result = await runOptionalAiReview({
      config: {
        provider: "fake",
        apiKey: "secret-value",
        model: "fake-model",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      },
      provider,
      input: sampleInput,
      sourceBriefIssueNumber: 11,
      usageRecord: { period: "2026-09", callsThisPeriod: 5 },
      now,
    });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.usageRecord).toEqual({
      period: "2026-09",
      callsThisPeriod: 6,
    });
  });
});

describe("provider factory", () => {
  it("has no vendor implemented yet, per project spec (provider/budget/credentials remain external configuration)", () => {
    expect(() =>
      createProvider({
        provider: "anything",
        apiKey: "x",
        model: "default",
        maxCallsPerRun: 1,
        maxCallsPerPeriod: 20,
      }),
    ).toThrow(/Unsupported AI provider/);
  });
});

describe("Generated Article isolation from public content", () => {
  it("is never registered as an Astro content collection", () => {
    expect(Object.keys(collections)).not.toContain("generatedArticles");
    expect(Object.keys(collections).sort()).toEqual(
      ["academicResults", "milestones", "notes", "works"].sort(),
    );
  });
});
