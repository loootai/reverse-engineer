---
name: competitor-diff
description: "Compare a competitor or prospect against its own earlier snapshot and report only what changed: pricing page, positioning, hiring, tech stack, ads, search rank. Keeps dated snapshots on disk so nothing is paid for twice. Use when the user says: what changed at competitor.com, diff their pricing, watch this competitor, weekly competitor check, compare this week to last week, did they change their homepage, track their ads or hiring, save a baseline snapshot."
---

# Competitor diff

Compare dated snapshots of a competitor's public footprint and state the differences as findings, not a pile of raw output. The first run creates the baseline. Every later run reports changes only.

## When to use

- A repeat check on 1 to 10 competitors or key prospects.
- Saving the baseline during a reverse engineering run.

## Inputs

- Domain list and the watch items per domain. Default items: pricing page text, home page headline, open roles, tech stack, Meta ads, rank for up to 5 terms.
- Snapshot folder. Default `./watch/<domain>/`. Files are named `<item>-YYYY-MM-DD.md` or `.json`.
- Cap in USD per run. Default $0.20 per domain.

## Procedure

1. Check the folder. If no earlier snapshot of an item exists, this run is the baseline for it.
2. Quote. Find each job below with `search_catalog` or the public catalog and `inspect` it (free, needs a sign-in). Sum the maximum costs over all domains. Tell the user the total and wait for a yes above $0.10 or above 100 calls. There is no dry-run call. Inspect is the quote.
3. Run each job once per item with a fresh `idempotencyKey` and `maxCostUsd`. Use keys of the form `<domain>-<item>-<date>`, so a retry of the same call is safe and a new day is a new call.
4. Save each answer to the folder: markdown for pages, JSON for structured answers. Put the run's `actualCost` at the top of the file as a comment.
5. Diff each item that has an earlier snapshot:

   ```
   python3 skills/competitor-diff/scripts/diff_snapshots.py <old> <new>
   ```

   Adjust the path to where the skill is installed. The script only reads the two files. It uses the Python standard library and handles text and JSON.
6. Judge. Ignore noise: dates, counters, session ids, rotating testimonials. Report a change only when it matters for sales or positioning, and say why.
7. Report. Changes first, ranked by importance. Unchanged items get one line.

## Jobs (catalog revision 101897, read 2026-10-11; inspect shows the live price)

| Item | Job | From, per call |
|---|---|---|
| Pricing or home page text | `job:web.scrape.markdown` | $0.0002 |
| Open roles | `job:jobs.company` | $0.01 |
| Tech stack | `job:company.technographics` | $0 |
| Meta ads | `job:ads.meta.search` | $0.00188 |
| Rank for a term | `job:google.serp.organic` | $0.0009 |
| AI answer citation | `job:google.serp.ai-mode` | $0.002 |
| New LinkedIn posts | `job:linkedin.company.posts` | $0.00188 |

On the free path, fetch the pricing and home pages with a plain GET and save the text. The diff script works the same.

## Output format

```
# Competitor changes: <date> vs <previous date>
Spent $<x> for <n> calls.
## Changed
- <domain> / <item>: <what changed> (old -> new). Why it matters: <one line>.
## Unchanged
- <domain>: pricing, stack
## Could not check
- <domain> / <item>: <reason>
```

## Failure handling

- A scrape that differs only by layout or dates: say "cosmetic" and do not raise an alarm.
- A job that missed today: keep the older snapshot as current, report "not checked", and never diff against an empty file.
- Snapshot folder missing: create it and treat the run as baseline.
- A page blocked or behind a login: mark unknown. Do not guess and do not get around it.
- Balance too low: show the top-up link. Never pay for the user.

## Example

A baseline saved on one day. A week later the scrape differs by two lines: the Team plan moved from "$29 per seat" to "$35 per seat" and a security badge appeared. The script prints `- Team: $29 per seat` and `+ Team: $35 per seat`. Report: "Team price up 21 percent. Our $29 plan is now the cheaper one." One scrape cost about $0.0002.

The prices here are illustrative.

## Related

`reverse-engineer` runs this skill as its phase 5.
