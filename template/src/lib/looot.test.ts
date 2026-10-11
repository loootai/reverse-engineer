import { describe, expect, it, vi } from "vitest";
import { balanceUsdOf, LoootClient, LoootError, loootFromEnv, mapError } from "./looot";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("LoootClient", () => {
  it("posts endpoint, input, idempotency key, the bearer token and maxCostUsd, and adds fallback only when asked", async () => {
    const f = vi.fn(async () => json({ runId: "run_1", status: "completed", result: {}, actualCost: 0.0019 }));
    const client = new LoootClient({ token: "tok_test", fetch: f as unknown as typeof fetch });
    await client.run("job:company.enrich", { domain: "a.example" }, "k1");
    await client.run("job:company.enrich", { domain: "b.example" }, "k2", { fallback: true, maxCostUsd: 0.0038 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.looot.ai/v1/runs?wait=30");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok_test");
    expect(JSON.parse(init.body as string)).toEqual({ endpointId: "job:company.enrich", input: { domain: "a.example" }, idempotencyKey: "k1" });
    expect(JSON.parse((f.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ fallback: true, maxCostUsd: 0.0038 });
  });

  it("polls a run that is not finished, then stops at the terminal status", async () => {
    const answers = [json({ runId: "r", status: "running" }), json({ runId: "r", status: "completed", actualCost: "0.0019" })];
    const f = vi.fn(async () => answers.shift()!);
    const client = new LoootClient({ token: "t", fetch: f as unknown as typeof fetch, sleep: async () => {} });
    expect((await client.runAndWait("e", {}, "k")).status).toBe("completed");
    expect((f.mock.calls[1] as unknown as [string])[0]).toBe("https://api.looot.ai/v1/runs/r");
  });

  it("hands back a run still going at the poll timeout instead of failing it", async () => {
    const f = vi.fn(async () => json({ runId: "r", status: "queued" }));
    const client = new LoootClient({ token: "t", fetch: f as unknown as typeof fetch, sleep: async () => {}, pollTimeoutMs: 0 });
    expect((await client.runAndWait("e", {}, "k")).status).toBe("queued");
  });

  it("throws LoootError with the status and code from looot", async () => {
    const bad = new LoootClient({ token: "t", fetch: (async () => json({ error: { code: "insufficient_funds", message: "Top up" } }, 402)) as unknown as typeof fetch });
    await expect(bad.run("e", {}, "k")).rejects.toMatchObject({ status: 402, code: "insufficient_funds" });
    expect(() => loootFromEnv({})).toThrow(LoootError);
  });
});

describe("mapError", () => {
  it("stops the run on 401 and 402 and records the rest per call", () => {
    expect(mapError(new LoootError("no", 401, "unauthorized"))).toMatchObject({ kind: "auth", stopRun: true });
    expect(mapError(new LoootError("no", 402, "insufficient_funds"))).toMatchObject({ kind: "balance", stopRun: true });
    expect(mapError(new LoootError("slow down", 429))).toMatchObject({ kind: "rate_limited", stopRun: false });
    expect(mapError(new LoootError("same key, other input", 409, "idempotency_conflict"))).toMatchObject({ kind: "conflict", stopRun: false });
    expect(mapError(new Error("socket closed"))).toMatchObject({ kind: "request", stopRun: false });
  });
});

describe("balanceUsdOf", () => {
  it("finds a balance in a few shapes and returns null when there is none", () => {
    expect(balanceUsdOf({ availableUsd: 4.5 })).toBe(4.5);
    expect(balanceUsdOf({ balance: { available: "2.25" } })).toBe(2.25);
    expect(balanceUsdOf({ nothing: 1 })).toBeNull();
  });
});
