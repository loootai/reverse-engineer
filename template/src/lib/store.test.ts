import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ledger } from "./ledger";
import { loadState, mergeRun, saveState } from "./store";

describe("state", () => {
  it("reads a missing or broken file as empty and round-trips a saved one", () => {
    const dir = mkdtempSync(join(tmpdir(), "app-state-"));
    expect(loadState(join(dir, "none.json"))).toEqual({ ledger: [], results: {} });
    writeFileSync(join(dir, "bad.json"), "{nope");
    expect(loadState(join(dir, "bad.json"))).toEqual({ ledger: [], results: {} });
    const s = { ledger: [], results: { k: { item: "a", jobId: "j", status: "done" as const, costMicros: 1, key: "k", runId: "r" } } };
    saveState(join(dir, "s.json"), s);
    expect(loadState(join(dir, "s.json"))).toEqual(s);
  });
  it("lets a done result replace a pending one but never the other way", () => {
    const pending = { item: "a", jobId: "j", status: "pending" as const, costMicros: 0, key: "k", runId: "r" };
    const done = { ...pending, status: "done" as const, costMicros: 5 };
    let s = mergeRun({ ledger: [], results: {} }, [pending], new Ledger());
    s = mergeRun(s, [done], new Ledger());
    expect(s.results.k.status).toBe("done");
    s = mergeRun(s, [pending], new Ledger());
    expect(s.results.k.status).toBe("done");
  });
});
