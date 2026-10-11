import type { JobSpec } from "@/jobs";
import { usdPrecise } from "@/lib/money";

export interface QuoteLine {
  jobId: string;
  label: string;
  endpointId: string;
  calls: number;
  priceMicros: number;
}

export interface Quote {
  items: number;
  /** Items answered in an earlier run. They cost nothing now. */
  cachedItems: number;
  lines: QuoteLine[];
  /** The most this run can cost at list price. */
  maxMicros: number;
  capMicros: number;
  /** true when the worst case is above the cap, so the run will stop early. */
  capBinds: boolean;
}

/**
 * Prices a run before it happens, at list price. One call per job for every item that has no stored answer.
 * It is a ceiling: the real charge is read from each run.
 */
export function buildQuote(items: string[], jobs: JobSpec[], capMicros: number, answered: ReadonlySet<string> = new Set()): Quote {
  const unique = [...new Set(items)];
  const lines: QuoteLine[] = jobs.map((j) => ({
    jobId: j.id,
    label: j.label,
    endpointId: j.endpointId,
    calls: unique.filter((it) => !answered.has(`${j.id}:${it}`)).length,
    priceMicros: j.priceMicros,
  }));
  const maxMicros = lines.reduce((n, l) => n + l.calls * l.priceMicros, 0);
  const cached = unique.filter((it) => jobs.every((j) => answered.has(`${j.id}:${it}`))).length;
  return { items: unique.length, cachedItems: cached, lines, maxMicros, capMicros, capBinds: maxMicros > capMicros };
}

/** Plain-text quote for the CLI. */
export function renderQuote(q: Quote, note: string): string {
  const out = [`${q.items} items, ${q.cachedItems} already answered (free).`];
  for (const l of q.lines) out.push(`  ${l.label.padEnd(34)} ${l.jobId.padEnd(22)} ${usdPrecise(l.priceMicros)} x ${String(l.calls).padStart(4)} = ${usdPrecise(l.priceMicros * l.calls)}`);
  out.push(`Most this run can cost: ${usdPrecise(q.maxMicros)}. Spend cap: ${usdPrecise(q.capMicros)}.${q.capBinds ? " The cap is below the worst case, so the run will stop early." : ""}`);
  out.push(note);
  return out.join("\n");
}
