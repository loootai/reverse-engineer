---
name: bounded-probe
description: "Before a bulk looot run, design and run a tiny capped experiment: pick the job, test 3 to 5 real inputs, measure hit rate and real cost per row, project the full cost, and recommend go, change or stop. Use when the user says: test this before running the whole list, how much will 500 leads cost, try it on a few first, is this job worth it, pilot run, compare two providers on a sample, estimate the cost of this enrichment, probe before we commit."
---

# Bounded probe

Run a small, controlled experiment before anything runs at scale. The target, the action and the limit are declared first. The experiment is a looot run on a handful of rows.

## When to use

- A plan with more than 20 paid calls, or a job the user has not run before.
- Choosing between two jobs or providers for the same task.
- Not needed for a single call under $0.01.

## Inputs

- The task in plain words and the full input set (a CSV, a list or a count).
- Sample size, default 5, maximum 10. Probe cap, default $0.10.
- The success definition: what counts as a hit (an email found, a company returned with size and industry). Ask once if unclear.

## Procedure

1. Declare the experiment before running anything: job, sample rows, the fields that count as a hit, the probe cap, and the stop rule ("stop after 2 errors in a row or when spend passes the cap").
2. Find the job. Use `search_catalog`, or `GET https://api.looot.ai/v1/public-catalog?q=<words>` with no sign-in. Take rows that run now. Never invent a job id.
3. Quote. `inspect` (free, needs a sign-in) gives exact input names, the price formula and the maximum cost. There is no dry-run call. Inspect is the quote. Tell the user: "5 rows, at most $0.02, probe cap $0.10." Wait for a yes if above $0.10.
4. Pick the sample so it spreads: a typical row, an easy row, a hard row (small company, odd name, non-US). Do not pick only easy rows. For a long list take every k-th row.
5. Run one row first and read the whole answer: fields returned, `outcome`, `actualCost`, which attempts were billed. Then run the rest, each with its own `idempotencyKey`, `fallback: true` and `maxCostUsd` at twice the quoted price.
6. Measure: hit rate, average and worst `actualCost`, fields that came back empty, latency. Note whether misses were billed.
7. Project: rows times average cost, and a range from the worst cost and the hit rate. Add follow-up jobs, such as verify after find.
8. Recommend one of three:
   - go: cost and hit rate are fine.
   - change: try another job or `prefer: "reliable"`, or fix the input format.
   - stop: not worth it, or the catalog lacks it. Run `request-provider`.
   If the full run is above $0.10 or 100 rows, ask for a yes with the projected total.
9. Save the probe results to a file so the full run reuses the sample rows instead of paying for them again.

## Jobs often probed (catalog revision 101897, read 2026-10-11; inspect shows the live price)

| Task | Job | From, per call |
|---|---|---|
| Find a work email | `job:people.email.find` | $0.003598 |
| Verify an email | `job:people.email.verify` | $0.00145 |
| Enrich a company | `job:company.enrich` | $0.0019 |
| Find contacts at a domain | `job:people.domain.search` | $0.0089 |
| Find companies by filter | `job:company.search` | $0.0089 |
| Scrape a page to markdown | `job:web.scrape.markdown` | $0.0002 |
| Google results | `job:google.serp.organic` | $0.0009 |

## Output format

```
# Probe: <job>, <n> rows, <date>
Spent $<x> (cap $<y>). Hit rate <h>/<n>. Average $<a>, worst $<w> per row.
Misses billed: <count>.
Projection for <N> rows: $<low> to $<high>, expected $<mid>.
Recommendation: go | change | stop. One-line reason.
Next step and its price.
```

## Failure handling

- Two errors in a row: stop, report the error text, do not retry the same input.
- Hit rate under 40 percent: recommend change or stop before projecting the full cost.
- Cost above the quoted maximum: stop and send `feedback` with the run id.
- 402: give the user the top-up link (minimum $5). Never pay for them.
- Same idempotency key with a different input returns `409 idempotency_conflict`. Use a new key.
- A run still queued or running is pending, not failed. Poll it with `runs_get` before counting it.

## Example

"Find work emails for these 400 leads, test first." Declared: `job:people.email.find`, 5 rows, a hit means an address returned, cap $0.10. Inspect says from $0.003598. Result: 4 of 5 hits, average $0.0031, worst $0.0036, the miss was not billed. Projection for 400 rows: about $1.20 to $1.50, plus verify on 320 hits at $0.00145, about $0.46. Recommendation: go, total about $2. Ask for a yes at that total, since it passes 100 calls.

The numbers in this example are illustrative. No run produced them.

## Related

`reverse-engineer` runs this skill as its phase 1.
