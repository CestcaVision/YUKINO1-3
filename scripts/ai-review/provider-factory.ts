import type { AiConfig } from "../../src/ai/config.ts";
import type { AiProvider } from "../../src/ai/provider.ts";

/**
 * Maps a configured provider name to a concrete adapter. No vendor is
 * selected yet (provider, model, budget, and credentials are all external
 * configuration, per project spec) — every provider name is currently
 * unsupported. Adding a real adapter later only needs a case added here;
 * nothing else in scripts/ai-review/ or src/ai/ depends on a vendor SDK.
 */
export function createProvider(config: AiConfig): AiProvider {
  throw new Error(`Unsupported AI provider: "${config.provider}"`);
}
