import { JOBS, OPTIONAL_JOBS, PRICES_AS_OF } from "@/jobs";
import { usdPrecise } from "@/lib/money";

export const metadata = { title: "Jobs and prices" };

export default function JobsPage() {
  const rows = [...JOBS.map((j) => ({ ...j, on: true })), ...OPTIONAL_JOBS.map((j) => ({ ...j, on: false }))];
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-20 font-semibold">Jobs and prices</h1>
        <p className="mt-1 text-13 text-mute">List prices from the public looot catalog, read {PRICES_AS_OF}. The real charge is read from each run. Edit src/jobs.ts to change the jobs.</p>
      </header>
      <div className="overflow-x-auto rounded-panel border border-line bg-panel">
        <table className="w-full text-left text-13">
          <thead>
            <tr className="text-11 text-mute">
              {["Job", "What it does", "Endpoint", "List price per call", "In the default run"].map((h) => (
                <th key={h} scope="col" className="h-8 border-b border-line px-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id}>
                <td className="num border-b border-line px-3 py-1.5">{j.id}</td>
                <td className="border-b border-line px-3 py-1.5">{j.label}</td>
                <td className="num border-b border-line px-3 py-1.5">{j.endpointId}</td>
                <td className="num border-b border-line px-3 py-1.5">{usdPrecise(j.priceMicros)}</td>
                <td className="border-b border-line px-3 py-1.5">{j.on ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
