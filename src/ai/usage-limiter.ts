export interface UsageRecord {
  /** Calendar period the record belongs to, e.g. "2026-09" (UTC year-month). */
  period: string;
  callsThisPeriod: number;
}

export interface UsageLimits {
  maxCallsPerRun: number;
  maxCallsPerPeriod: number;
}

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  /** The record to persist regardless of the decision (rolled over to the current period if needed). */
  record: UsageRecord;
}

export function periodKeyFor(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Pure usage-limiting decision, enforcing both a single-run limit and a
 * rolling period (monthly) limit. `callsAlreadyThisRun` is the number of AI
 * calls already made within the current process invocation; `persisted` is
 * the cross-run counter for the current period, or null if none exists yet.
 * Never allows a call once either limit is reached, and a caller must not
 * act on partial output when `allowed` is false.
 */
export function checkUsage(
  persisted: UsageRecord | null,
  limits: UsageLimits,
  now: Date,
  callsAlreadyThisRun: number,
): UsageCheck {
  const currentPeriod = periodKeyFor(now);
  const current: UsageRecord =
    persisted && persisted.period === currentPeriod
      ? persisted
      : { period: currentPeriod, callsThisPeriod: 0 };

  if (callsAlreadyThisRun >= limits.maxCallsPerRun) {
    return {
      allowed: false,
      reason: "per-run AI call limit reached",
      record: current,
    };
  }

  if (current.callsThisPeriod >= limits.maxCallsPerPeriod) {
    return {
      allowed: false,
      reason: "monthly AI call limit reached",
      record: current,
    };
  }

  return {
    allowed: true,
    record: { ...current, callsThisPeriod: current.callsThisPeriod + 1 },
  };
}
