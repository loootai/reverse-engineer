"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch } from "./adminFetch";

interface QuoteLine {
  jobId: string;
  label: string;
  calls: number;
  priceMicros: number;
}
interface Quote {
  items: number;
  cachedItems: number;
  lines: QuoteLine[];
  maxMicros: number;
  capMicros: number;
  capBinds: boolean;
}

const money = (micros: number) => `$${(micros / 1e6).toFixed(micros !== 0 && micros < 10_000 ? 4 : 2)}`;

/** Paste items, see the quote, then run. The Run button shows the most it can spend. */
export function RunPanel({ initial, demo, capUsd }: { initial: string; demo: boolean; capUsd: number }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const items = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  async function call(dryRun: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, dryRun }) });
      const data = await res.json();
      if (data.quote) setQuote(data.quote);
      if (!res.ok) return setMessage(data.error ?? `Request failed (${res.status}).`);
      if (!dryRun) {
        setMessage(data.stopped ? `Stopped: ${data.stopped.message}` : `Done. Spent ${money(data.spentMicros)}.`);
        router.refresh();
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-panel border border-line bg-panel p-4" aria-label="Run">
      <label htmlFor="items" className="text-12 font-medium text-mute">
        Items, one per line
      </label>
      <textarea id="items" value={text} onChange={(e) => { setText(e.target.value); setQuote(null); }} rows={5} className="num mt-1 w-full rounded-control border border-line-strong bg-page p-2 text-13" />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <p className="text-12 text-mute">
          Spend cap per run: <strong className="num text-ink">{money(capUsd * 1e6)}</strong>, set on the server.
        </p>
        <button type="button" disabled={busy || items.length === 0} onClick={() => call(true)} className="h-8 rounded-control border border-line-strong bg-panel px-3 text-13 font-medium hover:bg-hover disabled:opacity-50">
          Get quote
        </button>
        <button type="button" disabled={busy || items.length === 0 || !quote} onClick={() => call(false)} className="h-8 rounded-control bg-brand px-3 text-13 font-medium text-brand-ink hover:opacity-90 disabled:opacity-50">
          {quote ? `Run, at most ${money(Math.min(quote.maxMicros, quote.capMicros))}${demo ? " (simulated)" : ""}` : "Run"}
        </button>
      </div>
      {quote && (
        <div className="mt-3 text-13" role="status">
          <p className="text-mute">
            {quote.items} items, {quote.cachedItems} already answered (free). Most this run can cost: <strong className="num text-ink">{money(quote.maxMicros)}</strong>. Cap {money(quote.capMicros)}.{quote.capBinds ? " The cap is below the worst case, so the run will stop early." : ""}
          </p>
          <ul className="mt-1 text-12 text-mute">
            {quote.lines.map((l) => (
              <li key={l.jobId} className="num">
                {l.label} ({l.jobId}): {l.calls} x {money(l.priceMicros)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {message && (
        <p className="mt-2 text-13" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
