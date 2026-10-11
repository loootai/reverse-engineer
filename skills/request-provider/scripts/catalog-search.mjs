#!/usr/bin/env node
// Search the free looot catalog reads for one or more phrasings. No token, no cost.
// Usage: node catalog-search.mjs "ip to company" "company from ip address" [--json] [--limit 8]
// Reads GET /v1/catalog/overview?depth=jobs and GET /v1/public-catalog?q=<phrase>.
// Node 18 or newer. No dependencies. Only reads; it never sends a run.

const BASE = process.env.LOOOT_API_URL || "https://api.looot.ai";
const args = process.argv.slice(2);
const flags = { json: false, limit: 8 };
const phrases = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") flags.json = true;
  else if (args[i] === "--limit") flags.limit = Number(args[++i]) || 8;
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log('Usage: node catalog-search.mjs "<phrase>" ["<phrase>" ...] [--json] [--limit N]');
    process.exit(0);
  } else phrases.push(args[i]);
}
if (phrases.length === 0) {
  console.error('Give at least one phrase. Example: node catalog-search.mjs "ip to company"');
  process.exit(2);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} returned HTTP ${res.status}`);
  return res.json();
}

const money = (n) => (n === null || n === undefined ? "n/a" : `$${Number(n).toFixed(Number(n) < 0.01 ? 5 : 4).replace(/0+$/, "").replace(/\.$/, "")}`);

const overview = await get("/v1/catalog/overview?depth=jobs");
const jobs = [];
for (const c of overview.categories ?? [])
  for (const p of c.platforms ?? [])
    for (const j of p.jobs ?? []) jobs.push({ id: j.id, title: j.title, from: j.cheapestPerCall ?? j.cheapestPerResult ?? null, runnable: j.runnableCount ?? 0 });

const STOP = new Set(["to", "a", "an", "of", "from", "the", "for", "and", "or", "in", "on", "by", "with"]);
const words = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
const result = [];
for (const phrase of phrases) {
  const ws = words(phrase);
  const jobHits = jobs
    .map((j) => {
      const hay = new Set(words(`${j.id} ${j.title}`));
      return { ...j, score: ws.filter((w) => hay.has(w) || hay.has(w.replace(/s$/, ""))).length };
    })
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, flags.limit);
  let endpoints = [];
  try {
    const pc = await get(`/v1/public-catalog?q=${encodeURIComponent(phrase)}`);
    endpoints = (pc.items ?? []).slice(0, flags.limit).map((i) => ({
      id: i.catalogItemId,
      provider: i.providerId,
      title: i.title,
      capabilities: i.capabilities,
      price: i.price?.state === "known" ? i.price.amountMicros / 1e6 : null,
      unit: i.price?.unit ?? null,
      verification: i.verification?.state ?? "unknown",
    }));
  } catch (e) {
    endpoints = [{ error: String(e.message) }];
  }
  // An endpoint lists the job it belongs to as a capability, with dots written as underscores (ip_lookup is job ip.lookup).
  const jobIds = new Set(jobs.map((j) => j.id));
  const viaEndpoints = new Map();
  for (const e of endpoints) for (const c of e.capabilities ?? []) {
    const id = c.replaceAll("_", ".");
    if (jobIds.has(id)) viaEndpoints.set(id, (viaEndpoints.get(id) ?? 0) + 1);
  }
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const fromEndpoints = [...viaEndpoints.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ ...jobById.get(id), endpointsMatched: n }));
  result.push({ phrase, jobs: jobHits, jobsFromEndpoints: fromEndpoints, endpoints });
}

if (flags.json) {
  console.log(JSON.stringify({ revision: overview.revision, builtAt: overview.builtAt, result }, null, 2));
} else {
  console.log(`catalog revision ${overview.revision}, built ${overview.builtAt}`);
  for (const r of result) {
    console.log(`\n== ${r.phrase}`);
    console.log(r.jobsFromEndpoints.length ? "jobs the matching endpoints belong to (best first)" : "jobs the matching endpoints belong to: none");
    for (const j of r.jobsFromEndpoints) console.log(`  job:${j.id}  ${money(j.from)}  ${j.runnable}  ${j.title}  (${j.endpointsMatched} matching endpoints)`);
    console.log(r.jobs.length ? "jobs matched by name (job:<id>, cheapest per call, endpoints that run now)" : "jobs matched by name: none");
    for (const j of r.jobs) console.log(`  job:${j.id}  ${money(j.from)}  ${j.runnable}  ${j.title}`);
    console.log(r.endpoints.length ? "endpoints (id, provider, price, verification)" : "endpoints: none matched");
    for (const e of r.endpoints) console.log(e.error ? `  ${e.error}` : `  ${e.id}  ${e.provider}  ${money(e.price)}${e.unit ? "/" + e.unit : ""}  ${e.verification}`);
  }
  console.log("\nA phrase with no job and no endpoint is a candidate gap. Try other words before you call it missing.");
}
