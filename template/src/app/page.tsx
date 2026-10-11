import { RunPanel } from "@/components/RunPanel";
import { DEMO_DOMAINS } from "@/demo/fixtures";
import { getState, isDemo } from "@/lib/app";
import { usd } from "@/lib/money";

export default async function ResultsPage() {
  const state = await getState();
  const rows = Object.values(state.results).sort((a, b) => a.item.localeCompare(b.item));
  const demo = isDemo();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-20 font-semibold">Results</h1>
        <p className="mt-1 text-13 text-mute">Replace this page with your product. The quote, the cap, the ledger and the idempotency keys are already wired.</p>
      </header>
      <RunPanel initial={demo ? DEMO_DOMAINS.join("\n") : ""} demo={demo} />
      <section aria-label="Results" className="overflow-x-auto rounded-panel border border-line bg-panel">
        <table className="w-full text-left text-13">
          <thead>
            <tr className="text-11 text-mute">
              {["Item", "Job", "Status", "Cost", "Note"].map((h) => (
                <th key={h} scope="col" className="h-8 border-b border-line px-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-mute">
                  No results yet. Paste items above, get a quote, then run.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="num border-b border-line px-3 py-1.5">{r.item}</td>
                <td className="num border-b border-line px-3 py-1.5">{r.jobId}</td>
                <td className="border-b border-line px-3 py-1.5">{r.status}</td>
                <td className="num border-b border-line px-3 py-1.5">{usd(r.costMicros)}</td>
                <td className="border-b border-line px-3 py-1.5 text-mute">{r.status === "pending" ? "Still running. Run again to collect it. Never charged twice." : (r.error ?? "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
