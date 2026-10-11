import type { JobSpec } from "@/jobs";
import { APP_NAME } from "@/jobs";
import { Budget } from "@/lib/budget";
import { Ledger } from "@/lib/ledger";
import { mapError, PENDING_STATUSES, type LoootRun, type LoootRunner } from "@/lib/looot";
import { toMicros } from "@/lib/money";
import type { ItemResult } from "@/lib/types";

export interface PipelineInput {
  items: string[];
  jobs: JobSpec[];
  looot: LoootRunner;
  /** Spend cap for this run, in micro-dollars. */
  capMicros: number;
  ledger: Ledger;
  /** Results from earlier runs by key. A done result is never run again. A pending one is collected. */
  previous?: Map<string, ItemResult>;
  now?: Date;
  /** How many calls run at once. Each reserves its list price first, so the cap still holds. */
  concurrency?: number;
}

export interface PipelineOutput {
  results: ItemResult[];
  spentMicros: number;
  /** Set when a 401 or 402 ended the run early. */
  stopped?: { kind: string; message: string };
}

/** Stable per (input, job): the same input run again reuses the key, so looot replays the stored run and never charges twice. */
export function idempotencyKey(jobId: string, item: string): string {
  return `${APP_NAME}:${jobId}:${item.trim().toLowerCase()}`;
}

/**
 * Runs every job for every item, in small parallel batches.
 * The cap is checked before each call. A run still queued or running at the end is pending, never failed at $0.
 * A 401 (token) or 402 (balance) stops the run. Any other failure is recorded for that call.
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const { jobs, looot, ledger } = input;
  const now = (input.now ?? new Date()).toISOString();
  const budget = new Budget(input.capMicros);
  const results: ItemResult[] = [];
  const previous = input.previous ?? new Map<string, ItemResult>();
  const items = [...new Set(input.items.map((s) => s.trim()).filter(Boolean))];
  const work = items.flatMap((item) => jobs.map((job) => ({ item, job })));
  const batch = Math.max(1, input.concurrency ?? 5);
  let stopped: PipelineOutput["stopped"];

  for (let i = 0; i < work.length && !stopped; i += batch) {
    const slice = work.slice(i, i + batch);
    const settled = await Promise.all(
      slice.map(async ({ item, job }): Promise<ItemResult | { stop: { kind: string; message: string } }> => {
        const key = idempotencyKey(job.id, item);
        const before = previous.get(key);
        if (before?.status === "done") return before;
        if (!budget.reserve(job.priceMicros)) return { item, jobId: job.id, status: "skipped_cap", costMicros: 0, key, runId: "", error: "Not run: the next call would pass the spend cap." };
        let run: LoootRun;
        try {
          run = await looot.runAndWait(job.endpointId, job.buildInput(item), key, { fallback: job.fallback, maxCostUsd: (job.priceMicros * 2) / 1_000_000 });
        } catch (e) {
          budget.settle(job.priceMicros, 0);
          const m = mapError(e);
          if (m.stopRun) return { stop: { kind: m.kind, message: m.message } };
          const failed: ItemResult = { item, jobId: job.id, status: "failed", costMicros: 0, key, runId: "", error: m.message };
          ledger.add({ at: now, jobId: job.id, key, status: "failed", costMicros: 0, runId: "" });
          return failed;
        }
        const cost = toMicros(run.actualCost);
        budget.settle(job.priceMicros, cost);
        const status = run.status === "completed" ? "done" : PENDING_STATUSES.has(run.status) ? "pending" : "failed";
        const provider = ["providerId", "provider", "endpointId"].map((k) => run[k]).find((v): v is string => typeof v === "string" && v !== "");
        ledger.add({ at: now, jobId: job.id, key, status, costMicros: cost, runId: run.runId, provider });
        return { item, jobId: job.id, status, costMicros: cost, key, runId: run.runId, raw: status === "done" ? run.result : undefined, error: status === "failed" ? (run.error?.message ?? `Run ${run.runId} is ${run.status}.`) : undefined };
      }),
    );
    for (const s of settled) {
      if ("stop" in s) stopped ??= s.stop;
      else results.push(s);
    }
  }
  if (stopped) {
    const done = new Set(results.map((r) => r.key));
    for (const { item, job } of work) {
      const key = idempotencyKey(job.id, item);
      if (!done.has(key)) results.push({ item, jobId: job.id, status: "skipped_cap", costMicros: 0, key, runId: "", error: `Stopped: ${stopped.message}` });
    }
  }
  return { results, spentMicros: budget.spent, stopped };
}
