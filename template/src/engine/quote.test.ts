import { describe, expect, it } from "vitest";
import type { JobSpec } from "@/jobs";
import { toMicros } from "@/lib/money";
import { buildQuote, renderQuote } from "./quote";

const TEST_JOB: JobSpec = { id: "test.job", label: "Test job", endpointId: "test-endpoint", priceMicros: 1_900, fallback: true, buildInput: (item) => ({ domain: item }) };
const JOBS = [TEST_JOB];

describe("buildQuote", () => {
  it("prices every unique item at list price and flags a cap below the worst case", () => {
    const q = buildQuote(["a.example", "b.example", "a.example"], JOBS, toMicros(0.003));
    expect(q.items).toBe(2);
    expect(q.maxMicros).toBe(2 * TEST_JOB.priceMicros);
    expect(q.capBinds).toBe(true);
  });
  it("counts answered items as free", () => {
    const q = buildQuote(["a.example", "b.example"], JOBS, toMicros(1), new Set(["test.job:a.example"]));
    expect(q.cachedItems).toBe(1);
    expect(q.maxMicros).toBe(TEST_JOB.priceMicros);
  });
  it("renders a quote that names the job id and the cap", () => {
    const text = renderQuote(buildQuote(["a.example"], JOBS, toMicros(1)), "List prices dated today.");
    expect(text).toContain("test.job");
    expect(text).toContain("Spend cap: $1.00");
  });
});
