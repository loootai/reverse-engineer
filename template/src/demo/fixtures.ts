import type { LoootRun, LoootRunner } from "@/lib/looot";

/** Made-up companies on the reserved `.example` domain. No real company or person is in demo mode. */
export const DEMO_DOMAINS = ["northwind.example", "fabrikam.example", "contoso.example", "tailspin.example", "wingtip.example"];

const SAMPLE: Record<string, { name: string; industry: string; employees: number; country: string }> = {
  "northwind.example": { name: "Northwind Traders", industry: "Wholesale", employees: 120, country: "US" },
  "fabrikam.example": { name: "Fabrikam", industry: "Manufacturing", employees: 540, country: "DE" },
  "contoso.example": { name: "Contoso", industry: "Software", employees: 85, country: "GB" },
  "tailspin.example": { name: "Tailspin Toys", industry: "Retail", employees: 32, country: "US" },
  "wingtip.example": { name: "Wingtip", industry: "Consumer goods", employees: 260, country: "NL" },
};

/**
 * Stand-in for looot in demo mode and in tests. It makes no network call and spends nothing.
 * Costs are the list price, booked as simulated spend. One domain stays "running" on its first call to show a pending row.
 */
export class DemoRunner implements LoootRunner {
  readonly seen = new Set<string>();
  constructor(private readonly priceUsd = 0.0019) {}

  async runAndWait(_endpointId: string, input: Record<string, unknown>, idempotencyKey: string): Promise<LoootRun> {
    // The first string in the input is the item, whatever the job calls it (domain, url, ip).
    const domain = String(Object.values(input).find((v) => typeof v === "string") ?? "").replace(/^https?:\/\//, "");
    const first = !this.seen.has(idempotencyKey);
    this.seen.add(idempotencyKey);
    if (domain === "wingtip.example" && first) return { runId: `demo_${idempotencyKey.length}_p`, status: "running" };
    const hit = SAMPLE[domain];
    if (!hit) return { runId: `demo_${domain}`, status: "completed", result: { found: false }, actualCost: 0 };
    return { runId: `demo_${domain}`, status: "completed", result: { found: true, ...hit, domain }, actualCost: this.priceUsd, provider: "demo" };
  }
}
