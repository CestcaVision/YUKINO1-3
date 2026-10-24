export interface AiConfig {
  provider: string;
  apiKey: string;
  model: string;
  maxCallsPerRun: number;
  maxCallsPerPeriod: number;
}

export type AiEnv = Readonly<Record<string, string | undefined>>;

const DEFAULT_MAX_CALLS_PER_RUN = 1;
const DEFAULT_MAX_CALLS_PER_PERIOD = 20;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Loads AI provider configuration from the environment. The concrete
 * provider, model, budget, and credential are all external configuration —
 * this never hardcodes or invents a default provider. Returns null when the
 * feature is not configured (no provider name or no credential), so callers
 * can skip the optional AI task cleanly rather than failing the build,
 * classification, or any deterministic workflow.
 */
export function loadAiConfig(env: AiEnv): AiConfig | null {
  const provider = env.AI_PROVIDER?.trim();
  const apiKey = env.AI_API_KEY?.trim();
  if (!provider || !apiKey) return null;

  return {
    provider,
    apiKey,
    model: env.AI_MODEL?.trim() || "default",
    maxCallsPerRun: parsePositiveInt(
      env.AI_MAX_CALLS_PER_RUN,
      DEFAULT_MAX_CALLS_PER_RUN,
    ),
    maxCallsPerPeriod: parsePositiveInt(
      env.AI_MAX_CALLS_PER_PERIOD,
      DEFAULT_MAX_CALLS_PER_PERIOD,
    ),
  };
}
