// Generic fallback for common API-key shapes, even when the literal secret
// value was not supplied to redactSecrets (e.g. a key pasted into model
// output rather than the credential this run was configured with).
const GENERIC_SECRET_PATTERN = /\b(?:sk|pk|key|token)-[A-Za-z0-9_-]{12,}\b/gi;

/**
 * Redacts known secret values, plus generically secret-shaped substrings,
 * from arbitrary text. Every prompt, model output, and Issue input is
 * treated as untrusted and passed through this before it is logged or
 * written to any CI artifact, so a leaked credential can never surface.
 */
export function redactSecrets(
  text: string,
  secrets: readonly (string | undefined)[],
): string {
  let redacted = text;
  for (const secret of secrets) {
    if (!secret) continue;
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted.replace(GENERIC_SECRET_PATTERN, "[REDACTED]");
}
