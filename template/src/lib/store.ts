import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Ledger, type LedgerEntry } from "./ledger";
import type { ItemResult } from "./types";

/** What the app keeps between runs: the cost ledger and the newest result for each key. */
export interface AppState {
  ledger: LedgerEntry[];
  results: Record<string, ItemResult>;
}

/** Where state lives. APP_DATA overrides the default `.data/state.json`. */
export function statePathFromEnv(env: Record<string, string | undefined> = process.env): string {
  // The path is chosen at run time on purpose; the comment keeps the bundler from tracing the whole project.
  return resolve(/*turbopackIgnore: true*/ env.APP_DATA ?? ".data/state.json");
}

/** Reads state. A missing or unreadable file is an empty state, never an error. */
export function loadState(path: string): AppState {
  if (!existsSync(path)) return { ledger: [], results: {} };
  try {
    const s = JSON.parse(readFileSync(path, "utf8")) as Partial<AppState>;
    return { ledger: Array.isArray(s.ledger) ? s.ledger : [], results: s.results && typeof s.results === "object" ? s.results : {} };
  } catch {
    return { ledger: [], results: {} };
  }
}

/** Writes state through a temp file and a rename, so a crash never leaves half a file. */
export function saveState(path: string, state: AppState): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, path);
}

/** Folds new results and ledger entries into the state. A done result replaces a pending one for the same key. */
export function mergeRun(state: AppState, results: ItemResult[], ledger: Ledger): AppState {
  const out: AppState = { ledger: [...state.ledger, ...ledger.entries], results: { ...state.results } };
  for (const r of results) {
    const old = out.results[r.key];
    if (old?.status === "done" && r.status !== "done") continue;
    if (r.status === "skipped_cap" && old) continue;
    out.results[r.key] = r;
  }
  return out;
}

/** Keys of items already answered, as `<jobId>:<item>`, for the quote. */
export function answeredSet(state: AppState): Set<string> {
  return new Set(Object.values(state.results).filter((r) => r.status === "done").map((r) => `${r.jobId}:${r.item}`));
}
