---
name: evidence-research
description: "Research a company, competitor, product or market question and return a findings ledger where every claim is tagged observed, inferred or unknown, with its source, the looot job that produced it and what it cost. Use when the user says: research this company, investigate acme.com, competitor brief, what do we really know about X, back this up with evidence, fact-check this market claim, build me a sourced brief, or asks for any research that must hold up when someone challenges it."
---

# Evidence research

An investigation is done when each conclusion says how you know it. This skill returns a ledger, not a story.

## When to use

- A brief on a company, competitor or market that the user will repeat to others.
- Before outreach, a pitch or a decision that leans on "facts" about a target.
- Not for a quick lookup of one field. Run `job:company.enrich` directly for that.

## Inputs

- Target: a domain (best), a company name, or a LinkedIn company URL.
- The questions. If none are given, use the default five: what they sell, who buys it, how big they are, what they run on, what they are doing now.
- Budget cap in USD. Default $0.25 per target. Ask before going above $0.10 if no cap is given.

## The three tags

- observed: a looot run or a public page returned it. Cite the run id or the URL and the date read.
- inferred: you concluded it from observed items. Name the items.
- unknown: no run answered it, or providers disagreed. Say what would settle it and the price.

Never write an inferred item as if it were observed. A provider that returns nothing has missed. That does not prove the thing does not exist. A third-party article is not first-party evidence. Write what it says as unknown, "reported by <source>".

## Procedure

1. Route the target. Domain: start with the company jobs. Name only: find the domain first with `job:web.search` ("<name> official site"), and confirm with the user if two candidates fit.
2. Write the checklist: each question and the job that can answer it (table below). Skip a question whose job is not worth its price for this target.
3. Quote. For each job, confirm the id with `search_catalog` or the public catalog, then `inspect` (free, needs a sign-in) for exact input names and the maximum cost. Add the numbers. Show one line: "7 calls, about $0.04, hard cap $0.25." Wait for a yes above $0.10. There is no dry-run call. Inspect is the quote.
4. Run cheap and broad first, one call per job, each with a fresh `idempotencyKey`, `fallback: true` and `maxCostUsd` set to the per-call cap. Read `status`, `outcome` and `actualCost`, never only the HTTP code.
5. Read answers summary-first. Pull the 3 to 5 facts that matter. Drill only when a specific gap remains. Never repeat an identical call.
6. Build the ledger. One row per claim: the claim, its tag, the evidence (run id and field, or URL and date), confidence, and the search boundary ("two providers tried, none found a funding round"). Confidence is high when two sources agree, medium for one, low for inferred.
7. Close the loop. Reopen the checklist and mark each question answered, partial or open. Do not call the brief complete while a requested question is open.
8. Save the brief and ledger to a file so nobody pays twice. Default `./research/<domain>-<date>.md`.

## Jobs (catalog revision 101897, read 2026-10-11; inspect shows the live price)

| Question | Job | From, per call |
|---|---|---|
| What they are, size, industry | `job:company.enrich` | $0.0019 |
| What they run on | `job:company.technographics` | $0 |
| Are they hiring, which roles | `job:jobs.company` | $0.01 |
| LinkedIn view of the company | `job:linkedin.company.profile` | $0.0015 |
| What they say publicly now | `job:linkedin.company.posts` | $0.00188 |
| Their own words on a page | `job:web.scrape.markdown` | $0.0002 |
| Press and news | `job:news.search` | $0.00099 |
| Open web, find the domain, cross-check | `job:web.search` | $0 |
| Ads they run | `job:ads.meta.search`, `job:ads.linkedin.search` | $0.00188 |
| Authority and backlinks | `job:backlinks.domain.summary` | $0.024 |

## Output format

```
# <Company>: evidence brief (<date>)
Spent: $<actual> of $<cap>. Calls: <n>.

## Answers
1. <question>: <one-line answer>. [observed|inferred|unknown, confidence]

## Ledger
| # | Claim | Tag | Evidence | Confidence | Boundary |

## Open questions
- <question>: would cost $<x> via <job>. Worth it? yes or no
```

## Failure handling

- Miss or empty: say so, try `fallback` once, then mark unknown. No retry loops.
- 402 insufficient balance: show the top-up link (minimum $5). Never pay for the user.
- Providers disagree: show both values with run ids, tag unknown, do not average.
- No job in the catalog for a question: run `request-provider` and say what you used instead.
- Anything odd or wrong: send `feedback` with the run id and no personal data.

## Example

Ask: "research example.com, I want to know if they would buy a data API." Plan: enrich, technographics, jobs, news, and two scrapes of /pricing and /customers. Quote: 6 calls, cap $0.25. After the runs:

- "About 100 to 200 employees" is observed (enrich, one provider).
- "Hiring 4 backend roles" is observed (jobs run).
- "Building data infrastructure in house" is inferred from those roles, confidence low.
- "Current data vendors" is unknown. A `job:web.research` call could answer it. The brief ends with that one open question and its price.

The numbers here are illustrative.

## Related

`reverse-engineer` runs this skill as its phase 4.
