import { describe, expect, it, vi } from "vitest";
import type { JobSpec } from "@/jobs";
import { Ledger } from "@/lib/ledger";
import { LoootError, type LoootRun, type LoootRunner } from "@/lib/looot";
import { toMicros } from "@/lib/money";
import { idempotencyKey, runPipeline } from "./pipeline";

const TEST_JOB: JobSpec = { id: "test.job", label: "Test job", endpointId: "test-endpoint", priceMicros: 1_900, fallback: true, buildInput: (item) => ({ domain: item }) };
const JOBS = [TEST_JOB];
const done = (cost = 0.0019): LoootRun => ({ runId: "run_ok", status: "completed", result: { name: "Acme" }, actualCost: cost });
const runnerOf = (fn: LoootRunner["runAndWait"]): LoootRunner => ({ runAndWait: vi.fn(fn) });

describe("runPipeline", () => {
  it("sends a stable idempotency key per input and job, and the same key on a second run", async () => {
    const looot = runnerOf(async () => done());
    await runPipeline({ items: ["a.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger() });
    await runPipeline({ items: ["A.example "], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger() });
    const calls = (looot.runAndWait as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][2]).toBe(idempotencyKey("test.job", "a.example"));
    expect(calls[1][2]).toBe(calls[0][2]);
    expect(calls[0][3]).toMatchObject({ fallback: true, maxCostUsd: 0.0038 });
  });

  it("stops before a call that would pass the cap and reports it as not run", async () => {
    const looot = runnerOf(async () => done());
    const out = await runPipeline({ items: ["a.example", "b.example", "c.example"], jobs: JOBS, looot, capMicros: toMicros(0.004), ledger: new Ledger(), concurrency: 1 });
    expect(out.results.filter((r) => r.status === "done")).toHaveLength(2);
    expect(out.results.filter((r) => r.status === "skipped_cap")).toHaveLength(1);
    expect(looot.runAndWait).toHaveBeenCalledTimes(2);
    expect(out.spentMicros).toBe(toMicros(0.0038));
  });

  it("holds the cap when calls run in parallel", async () => {
    const looot = runnerOf(async () => done());
    const out = await runPipeline({ items: ["a.example", "b.example", "c.example", "d.example"], jobs: JOBS, looot, capMicros: toMicros(0.004), ledger: new Ledger(), concurrency: 4 });
    expect(looot.runAndWait).toHaveBeenCalledTimes(2);
    expect(out.spentMicros).toBeLessThanOrEqual(toMicros(0.004));
  });

  it("records a run still going as pending, not failed, at $0", async () => {
    const looot = runnerOf(async () => ({ runId: "run_p", status: "running" }));
    const ledger = new Ledger();
    const out = await runPipeline({ items: ["a.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger });
    expect(out.results[0]).toMatchObject({ status: "pending", costMicros: 0, runId: "run_p" });
    expect(out.results[0].error).toBeUndefined();
    expect(ledger.entries[0].status).toBe("pending");
  });

  it("does not run a done result again, and collects a pending one with the same key", async () => {
    const key = idempotencyKey("test.job", "a.example");
    const looot = runnerOf(async () => done());
    const previous = new Map([[key, { item: "a.example", jobId: "test.job", status: "done" as const, costMicros: 1900, key, runId: "r0" }]]);
    await runPipeline({ items: ["a.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger(), previous });
    expect(looot.runAndWait).not.toHaveBeenCalled();
    const pend = new Map([[key, { item: "a.example", jobId: "test.job", status: "pending" as const, costMicros: 0, key, runId: "r1" }]]);
    await runPipeline({ items: ["a.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger(), previous: pend });
    expect(looot.runAndWait).toHaveBeenCalledTimes(1);
  });

  it("stops the whole run on a 401 or a 402 and marks the rest not run", async () => {
    const looot = runnerOf(async () => {
      throw new LoootError("Top up", 402, "insufficient_funds");
    });
    const out = await runPipeline({ items: ["a.example", "b.example", "c.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger(), concurrency: 1 });
    expect(out.stopped?.kind).toBe("balance");
    expect(looot.runAndWait).toHaveBeenCalledTimes(1);
    expect(out.results).toHaveLength(3);
    expect(out.results.every((r) => r.status === "skipped_cap")).toBe(true);
  });

  it("records another failure for that call only and carries on", async () => {
    let n = 0;
    const looot = runnerOf(async () => {
      if (n++ === 0) throw new LoootError("slow down", 429);
      return done();
    });
    const out = await runPipeline({ items: ["a.example", "b.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger(), concurrency: 1 });
    expect(out.results.map((r) => r.status)).toEqual(["failed", "done"]);
    expect(out.stopped).toBeUndefined();
  });

  it("books a failed run at the cost looot reports, which is $0 for a failure", async () => {
    const looot = runnerOf(async () => ({ runId: "run_f", status: "failed", error: { code: "provider_error", message: "No match" }, actualCost: 0 }));
    const out = await runPipeline({ items: ["a.example"], jobs: JOBS, looot, capMicros: toMicros(1), ledger: new Ledger() });
    expect(out.results[0]).toMatchObject({ status: "failed", costMicros: 0, error: "No match" });
  });
});
