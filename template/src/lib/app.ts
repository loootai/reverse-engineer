import "server-only";
import { DEMO_DOMAINS, DemoRunner } from "@/demo/fixtures";
import { runPipeline } from "@/engine/pipeline";
import { buildQuote } from "@/engine/quote";
import { JOBS } from "@/jobs";
import { Ledger } from "./ledger";
import { loootFromEnv, type LoootRunner } from "./looot";
import { toMicros } from "./money";
import { answeredSet, loadState, mergeRun, saveState, statePathFromEnv, type AppState } from "./store";

/** true when the web UI runs on sample data: no token, no network, no cost. */
export const isDemo = (): boolean => process.env.NEXT_PUBLIC_DEMO === "1";

/** The hardest ceiling for one run started from the web UI. The form cap cannot exceed it. */
export const MAX_UI_CAP_USD = 25;

const g = globalThis as unknown as { __demoState?: AppState };

/** Reads state. Demo mode keeps it in memory and seeds it with one run of the sample items. */
export async function getState(): Promise<AppState> {
  if (!isDemo()) return loadState(statePathFromEnv());
  if (!g.__demoState) {
    const ledger = new Ledger();
    const run = await runPipeline({ items: DEMO_DOMAINS.slice(0, 3), jobs: JOBS, looot: new DemoRunner(), capMicros: toMicros(1), ledger });
    g.__demoState = mergeRun({ ledger: [], results: {} }, run.results, ledger);
  }
  return g.__demoState;
}

function runner(): LoootRunner {
  return isDemo() ? new DemoRunner() : loootFromEnv();
}

/** Quote for a list of items, from stored answers and list prices. Makes no call. */
export async function quoteItems(items: string[], capUsd: number) {
  const state = await getState();
  return buildQuote(items, JOBS, toMicros(capUsd), answeredSet(state));
}

/** Runs the items and stores the result. In demo mode the stand-in runner is used and the state stays in memory. */
export async function runItems(items: string[], capUsd: number) {
  const state = await getState();
  const ledger = new Ledger();
  const run = await runPipeline({ items, jobs: JOBS, looot: runner(), capMicros: toMicros(capUsd), ledger, previous: new Map(Object.entries(state.results)) });
  const next = mergeRun(state, run.results, ledger);
  if (isDemo()) g.__demoState = { ...next, ledger: next.ledger.map((e) => ({ ...e, simulated: true })) };
  else saveState(statePathFromEnv(), next);
  return run;
}
