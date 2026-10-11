import { requireAdminPage } from "@/lib/auth/guard";
import { getState } from "@/lib/app";
import { Ledger } from "@/lib/ledger";
import { usd } from "@/lib/money";

export const metadata = { title: "Costs" };

export default async function CostsPage() {
  await requireAdminPage();
  const state = await getState();
  const ledger = new Ledger(state.ledger);
  const rows = ledger.byJob();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-20 font-semibold">Costs</h1>
        <p className="mt-1 text-13 text-mute">
          Every paid call, summed from the ledger. Total <strong className="num text-ink">{usd(ledger.totalMicros)}</strong> over {ledger.entries.length} calls.
        </p>
      </header>
      <div className="overflow-x-auto rounded-panel border border-line bg-panel">
        <table className="w-full text-left text-13">
          <thead>
            <tr className="text-11 text-mute">
              {["Job", "Calls", "Cost"].map((h) => (
                <th key={h} scope="col" className="h-8 border-b border-line px-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-mute">
                  No calls yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.jobId}>
                <td className="num border-b border-line px-3 py-1.5">{r.jobId}</td>
                <td className="num border-b border-line px-3 py-1.5">{r.calls}</td>
                <td className="num border-b border-line px-3 py-1.5">{usd(r.costMicros)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
