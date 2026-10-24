const NO_RESPONSE = "_No response_";

/**
 * Parses a GitHub Issue Form's rendered `### <label>` body into a heading ->
 * value map. Only splits on lines matching one of `knownHeadings` (not any
 * `### `-prefixed line), so a value that happens to contain a markdown
 * heading of its own is kept intact as part of that value rather than
 * silently truncated into an unrelated key.
 */
export function parseIssueFormBody(
  body: string,
  knownHeadings: readonly string[],
): Record<string, string> {
  const knownSet = new Set(knownHeadings);
  const normalized = body.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(/^### (.+)$/gm)].filter((match) =>
    knownSet.has(match[1].trim()),
  );

  const fields: Record<string, string> = {};
  for (const [index, match] of matches.entries()) {
    const heading = match[1].trim();
    const valueStart = match.index + match[0].length;
    const valueEnd = matches[index + 1]?.index ?? normalized.length;
    const rawValue = normalized.slice(valueStart, valueEnd).trim();
    fields[heading] = rawValue === NO_RESPONSE ? "" : rawValue;
  }

  return fields;
}
