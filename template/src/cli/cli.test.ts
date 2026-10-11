import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { LoootRunner } from "@/lib/looot";
import { LoootError } from "@/lib/looot";
import { JOBS } from "@/jobs";
import { usdPrecise } from "@/lib/money";
import { readItems, runCli } from "./cli";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "app-cli-"));
  const out: string[] = [];
  const err: string[] = [];
  return { dir, out, err, deps: (extra: object = {}) => ({ env: {}, out: (s: string) => out.push(s), err: (s: string) => err.push(s), ...extra }) };
}

describe("readItems", () => {
  it("reads lines, skips comments and blanks, and takes the domain column of a CSV", () => {
    expect(readItems("# list\na.example\n\nb.example\n")).toEqual(["a.example", "b.example"]);
    expect(readItems('name,domain\nAcme,"a.example"\nBeta,b.example\n')).toEqual(["a.example", "b.example"]);
  });
});

describe("runCli", () => {
  it("--dry-run prints the quote and makes no call and writes nothing", async () => {
    const s = setup();
    const file = join(s.dir, "in.txt");
    (await import("node:fs")).writeFileSync(file, "a.example\nb.example\n");
    const looot: LoootRunner = { runAndWait: vi.fn() };
    const code = await runCli(["--input", file, "--dry-run", "--out", join(s.dir, "out"), "--state", join(s.dir, "state.json")], s.deps({ looot }));
    expect(code).toBe(0);
    expect(looot.runAndWait).not.toHaveBeenCalled();
    expect(s.out.join("\n")).toContain(`Most this run can cost: ${usdPrecise(2 * JOBS[0].priceMicros)}`);
    expect(s.out.join("\n")).toContain("Dry run");
    expect(existsSync(join(s.dir, "out"))).toBe(false);
    expect(existsSync(join(s.dir, "state.json"))).toBe(false);
  });

  it("exits 2 with a clear message when a real run has no token", async () => {
    const s = setup();
    const file = join(s.dir, "in.txt");
    (await import("node:fs")).writeFileSync(file, "a.example\n");
    const code = await runCli(["--input", file, "--out", join(s.dir, "out"), "--state", join(s.dir, "state.json")], s.deps());
    expect(code).toBe(2);
    expect(s.err.join("\n")).toContain("LOOOT_TOKEN is not set");
  });

  it("runs with a mock, writes the reports and the state, and a second run is free", async () => {
    const s = setup();
    const file = join(s.dir, "in.txt");
    (await import("node:fs")).writeFileSync(file, "a.example\n");
    const looot: LoootRunner = { runAndWait: vi.fn(async () => ({ runId: "r1", status: "completed" as const, result: {}, actualCost: 0.0019 })) };
    const argv = ["--input", file, "--out", join(s.dir, "out"), "--state", join(s.dir, "state.json")];
    expect(await runCli(argv, s.deps({ looot }))).toBe(0);
    expect(readFileSync(join(s.dir, "out", "results.csv"), "utf8")).toContain("a.example");
    expect(await runCli(argv, s.deps({ looot }))).toBe(0);
    expect(looot.runAndWait).toHaveBeenCalledTimes(1);
  });

  it("exits 2 on a 402 and says how to top up", async () => {
    const s = setup();
    const file = join(s.dir, "in.txt");
    (await import("node:fs")).writeFileSync(file, "a.example\n");
    const looot: LoootRunner = { runAndWait: vi.fn(async () => { throw new LoootError("Low balance", 402, "insufficient_funds"); }) };
    const code = await runCli(["--input", file, "--out", join(s.dir, "out"), "--state", join(s.dir, "state.json")], s.deps({ looot }));
    expect(code).toBe(2);
    expect(s.err.join("\n")).toContain("Top up");
  });

  it("--demo runs on sample data without a token and shows a pending row", async () => {
    const s = setup();
    const code = await runCli(["--demo", "--out", join(s.dir, "out")], s.deps());
    expect(code).toBe(0);
    expect(s.out.join("\n")).toContain("1 pending");
  });

  it("rejects an unknown flag and a bad cap", async () => {
    const s = setup();
    expect(await runCli(["--nope"], s.deps())).toBe(2);
    expect(await runCli(["--demo", "--cap", "abc"], s.deps())).toBe(2);
  });
});
