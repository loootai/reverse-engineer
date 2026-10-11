import type { CallStatus } from "./types";

/** One call, as recorded. The idempotency key identifies it; the input is not stored. */
export interface LedgerEntry {
  at: string;
  jobId: string;
  /** Stable per (input, job). Running the same input again reuses it. */
  key: string;
  status: CallStatus;
  /** Real cost in micro-dollars, read from the run. */
  costMicros: number;
  runId: string;
  /** Provider looot used, when the run says. */
  provider?: string;
  simulated?: boolean;
}

/** An append-only record of every paid call. The web UI and the CLI show the same totals. */
export class Ledger {
  constructor(public entries: LedgerEntry[] = []) {}

  add(entry: LedgerEntry): void {
    this.entries.push(entry);
  }

  /** Total real cost in micro-dollars. */
  get totalMicros(): number {
    return this.entries.reduce((n, e) => n + e.costMicros, 0);
  }

  /** Cost and call count by job id. */
  byJob(): { jobId: string; calls: number; costMicros: number }[] {
    const m = new Map<string, { jobId: string; calls: number; costMicros: number }>();
    for (const e of this.entries) {
      const row = m.get(e.jobId) ?? { jobId: e.jobId, calls: 0, costMicros: 0 };
      row.calls += 1;
      row.costMicros += e.costMicros;
      m.set(e.jobId, row);
    }
    return [...m.values()].sort((a, b) => b.costMicros - a.costMicros);
  }

  /** The newest entry for a key, so a pending call that finished later wins. */
  latestByKey(): Map<string, LedgerEntry> {
    const m = new Map<string, LedgerEntry>();
    for (const e of this.entries) m.set(e.key, e);
    return m;
  }
}
