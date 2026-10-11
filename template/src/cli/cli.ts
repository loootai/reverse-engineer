import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { DEMO_DOMAINS, DemoRunner } from "@/demo/fixtures";
import { buildQuote, renderQuote } from "@/engine/quote";
import { runPipeline } from "@/engine/pipeline";
import { renderCsv, renderMarkdown } from "@/engine/report";
import { JOBS, PRICES_AS_OF } from "@/jobs";
import { Ledger } from "@/lib/ledger";
import { LoootError, loootFromEnv, type LoootRunner } from "@/lib/looot";
import { toMicros, usd } from "@/lib/money";
import { answeredSet, loadState, mergeRun, saveState, statePathFromEnv } from "@/lib/store";

export const HELP = `Usage: npm run app -- --input <file> [options]

  --input <file>   One item per line, or a CSV with a "domain" column. Required unless --demo.
  --demo           Use the built-in sample items and a stand-in for looot. No token, no network, no cost.
  --dry-run        Print the list-price quote and make no call. Writes nothing.
  --cap <usd>      Spend cap for this run. Default 1.
  --out <dir>      Where results.json, results.csv and results.md go. Default app-out
  --state <file>   Cost ledger and answers already bought. Default APP_DATA, else .data/state.json

A real run needs LOOOT_TOKEN in the environment. The CLI does not read .env files.
Exit codes: 0 done, 1 run failed, 2 usage error, refused or no token.`;

export interface CliDeps {
  env: Record<string, string | undefined>;
  out: (s: string) => void;
  err: (s: string) => void;
  now?: Date;
  /** Tests pass a mock. Real runs build one from LOOOT_TOKEN. */
  looot?: LoootRunner;
}

/** Reads items from a text file: one per line, or the "domain" column of a CSV. Blank lines and # comments are skipped. */
export function readItems(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return [];
  const head = lines[0].split(",").map((c) => c.trim().toLowerCase().replace(/^"|"$/g, ""));
  const col = head.indexOf("domain");
  if (col >= 0) return lines.slice(1).map((l) => (l.split(",")[col] ?? "").trim().replace(/^"|"$/g, "")).filter(Boolean);
  return lines;
}

/** Runs the headless command and returns the exit code. */
export async function runCli(argv: string[], deps: CliDeps): Promise<number> {
  const now = deps.now ?? new Date();
  let a;
  try {
    a = parseArgs({ args: argv, options: { input: { type: "string" }, demo: { type: "boolean", default: false }, "dry-run": { type: "boolean", default: false }, cap: { type: "string", default: "1" }, out: { type: "string", default: "app-out" }, state: { type: "string" }, help: { type: "boolean", default: false } } }).values;
  } catch (e) {
    deps.err(`${(e as Error).message}\n\n${HELP}`);
    return 2;
  }
  if (a.help) return deps.out(HELP), 0;
  if (!a.demo && !a.input) return deps.err(`--input is required (or use --demo).\n\n${HELP}`), 2;
  if (a.input && !existsSync(a.input)) return deps.err(`No file at ${a.input}`), 2;
  const capUsd = Number(a.cap);
  if (!Number.isFinite(capUsd) || capUsd < 0) return deps.err("--cap must be a number of dollars."), 2;
  const capMicros = toMicros(capUsd);

  const items = a.demo ? DEMO_DOMAINS : readItems(readFileSync(a.input as string, "utf8"));
  if (items.length === 0) return deps.err("The input has no items."), 2;
  const statePath = a.state ? resolve(a.state) : statePathFromEnv(deps.env);
  const state = a.demo ? { ledger: [], results: {} } : loadState(statePath);

  const quote = buildQuote(items, JOBS, capMicros, answeredSet(state));
  deps.out(renderQuote(quote, `List prices dated ${PRICES_AS_OF}. The real charge is read from each run.`));
  if (a["dry-run"]) return deps.out("Dry run: no looot call was made and nothing was written."), 0;
  if (quote.capBinds && !a.demo) deps.out("Note: the cap is below the worst case. The run stops before a call that would pass it.");

  let looot = deps.looot;
  if (a.demo) looot = new DemoRunner();
  if (!looot) {
    try {
      looot = loootFromEnv(deps.env);
    } catch (e) {
      if (e instanceof LoootError) return deps.err("LOOOT_TOKEN is not set. Create an agent token at https://looot.ai/settings, or use --dry-run or --demo."), 2;
      throw e;
    }
  }

  const ledger = new Ledger();
  const previous = new Map(Object.entries(state.results));
  const run = await runPipeline({ items, jobs: JOBS, looot, capMicros, ledger, previous, now });
  if (!a.demo) saveState(statePath, mergeRun(state, run.results, ledger));

  const outDir = resolve(a.out as string);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "results.json"), `${JSON.stringify({ generatedAt: now.toISOString(), simulated: a.demo, spentMicros: run.spentMicros, results: run.results }, null, 2)}\n`);
  writeFileSync(join(outDir, "results.csv"), renderCsv(run.results));
  writeFileSync(join(outDir, "results.md"), renderMarkdown(run.results, `Results, ${now.toISOString().slice(0, 10)}${a.demo ? " (demo data)" : ""}`));

  const count = (s: string) => run.results.filter((r) => r.status === s).length;
  deps.out(`Made ${ledger.entries.length} calls, spent ${usd(run.spentMicros)}${a.demo ? " (simulated)" : ""}. ${count("done")} done, ${count("pending")} pending, ${count("failed")} failed, ${count("skipped_cap")} not run. Files in ${outDir}`);
  if (run.stopped) {
    deps.err(`Stopped: ${run.stopped.message}`);
    return 2;
  }
  if (count("skipped_cap") > 0) deps.out(`Stopped at the ${usd(capMicros)} cap. Run again with a higher --cap to do the rest.`);
  if (count("pending") > 0) deps.out(a.demo ? `${count("pending")} pending (the demo keeps one call running on purpose, to show the state).` : `${count("pending")} pending (still running). Run the same command again to collect them. Pending calls are never charged twice.`);
  if (ledger.entries.length > 0 && count("done") === 0 && count("pending") === 0) return deps.err("Every call failed."), 1;
  return 0;
}
