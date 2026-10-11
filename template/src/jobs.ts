import { toMicros } from "@/lib/money";

/** The app's name. It prefixes every idempotency key, so two apps on one looot account never collide. */
export const APP_NAME = "looot-app";

/** Date the list prices below were read from the public catalog. Update it with the prices. */
export const PRICES_AS_OF = "2026-10-11";

/** One looot job the app calls for each input. Edit this file first when you rebuild something. */
export interface JobSpec {
  /** Short id used in keys, the ledger and reports. */
  id: string;
  label: string;
  /** What looot runs: `job:<id>` for a job (looot picks the provider) or an endpoint id for one provider. */
  endpointId: string;
  /** List price of one call in micro-dollars. Reserved against the cap before the call. */
  priceMicros: number;
  /** Let looot try the next provider when the first finds nothing. Valid for job ids only. */
  fallback: boolean;
  /** Builds the looot input for one item. Use the shared names (domain, url, email, name, company, linkedin_url). */
  buildInput(item: string): Record<string, unknown>;
}

/**
 * Starter jobs. `job:company.enrich` takes a domain and returns a company profile, from $0.0019 a call.
 * `job:web.scrape.markdown` takes a url and returns page text, from $0.0002 a call.
 * Find more with `node skills/rebuild-on-looot/scripts/catalog-search.mjs "<words>"` in the skills repo,
 * or GET https://api.looot.ai/v1/public-catalog?q=<words>.
 */
export const JOBS: JobSpec[] = [
  {
    id: "company.enrich",
    label: "Company profile from a domain",
    endpointId: "job:company.enrich",
    priceMicros: toMicros(0.0019),
    fallback: true,
    buildInput: (item) => ({ domain: item }),
  },
];

/** Extra jobs you can switch on in a copy of this app. Left out of the default run. */
export const OPTIONAL_JOBS: JobSpec[] = [
  {
    id: "web.scrape.markdown",
    label: "Page text as markdown",
    endpointId: "job:web.scrape.markdown",
    priceMicros: toMicros(0.0002),
    fallback: true,
    buildInput: (item) => ({ url: item.startsWith("http") ? item : `https://${item}` }),
  },
];
