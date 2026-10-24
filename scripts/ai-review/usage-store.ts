import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { UsageRecord } from "../../src/ai/usage-limiter.ts";

/**
 * Reads the persisted cross-run usage counter from disk. Missing or
 * unreadable state is treated as "no usage recorded yet" rather than an
 * error, so a first run (or a cache miss) never blocks the optional review.
 */
export function readUsageRecord(path: string): UsageRecord | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (
      parsed &&
      typeof parsed.period === "string" &&
      typeof parsed.callsThisPeriod === "number"
    ) {
      return parsed as UsageRecord;
    }
  } catch {
    // Corrupt or unreadable state file: treat as no prior usage.
  }
  return null;
}

export function writeUsageRecord(path: string, record: UsageRecord): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(record, null, 2));
}
