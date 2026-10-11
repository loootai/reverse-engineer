---
name: site-teardown
description: "Take apart a competitor or prospect website from the outside: pages and structure, positioning, pricing, tech stack, hiring, ads, search footprint and AI answer presence, using public pages and looot jobs with a quoted cap. Use when the user says: teardown this site, what is acme.com running, what is their funnel, what pages do they have, how do they rank, map their site, analyze their landing page, what does their pricing page say."
---

# Site teardown

Pick the route from the target, start with a summary, drill only where a question is open, and keep observations apart from guesses. This is the go-to-market view of a public website: how it sells.

## When to use

- Understand how a competitor or prospect sells: offer, pricing, funnel, stack, channels.
- Prepare a pitch, a positioning gap or a "what they do that we do not" list.
- Not for the product's internals. Use `reverse-engineer` for that. This skill reads public pages and public data only.

## Inputs

- Domain (required). Optional: one competitor of yours for a side-by-side, a country for search data, a budget cap (default $0.30, use 0 for free reads only).

## Procedure

1. Check `https://<domain>/robots.txt`. Do not fetch paths it disallows.
2. Quote. Find each job below with `search_catalog` or the public catalog, then `inspect` it (free, needs a sign-in). Add up the maximum costs. Tell the user: "about $0.05 expected, hard cap $0.30" and wait for a yes above $0.10. There is no dry-run call. Inspect is the quote.
3. Map the site. `job:web.site.map` on the domain, or the sitemap at `https://<domain>/sitemap.xml` with a plain GET. Group URLs by path prefix (pricing, customers, blog, docs, changelog, careers, integrations). Group sizes show where they invest. Pick at most 5 pages to read.
4. Read the pages with `job:web.scrape.markdown`, or a plain GET on the free path. Extract the headline and promise, who it is for, proof used (logos, numbers, quotes), price points and plan limits, the call to action, and what sits behind a form.
5. Stack. `job:company.technographics`. Note analytics, CRM, chat, billing, CMS and ad pixels. A pixel for a channel is evidence they run that channel. Tag it inferred.
6. Demand signals. `job:jobs.company` shows where they push (sales, partnerships, data). `job:company.enrich` gives size.
7. Paid presence. `job:ads.meta.search` and `job:ads.linkedin.search` by brand name. Count active ads, list the angles and landing URLs.
8. Search footprint. `job:google.serp.organic` for 3 to 5 terms they should own, and `job:google.serp.ai-mode` for the buying question. Record who wins and whether the domain is cited.
9. Assemble. Tag every point observed, inferred or unknown, as in `evidence-research`. End with what they do well, what is weak, and what you could do differently, each tied to an observation.

## Jobs (catalog revision 101897, read 2026-10-11; inspect shows the live price)

| Step | Job | From, per call |
|---|---|---|
| Site map | `job:web.site.map` | $0.0025 |
| Page text | `job:web.scrape.markdown` | $0.0002 |
| Stack | `job:company.technographics` | $0 |
| Hiring | `job:jobs.company` | $0.01 |
| Size and industry | `job:company.enrich` | $0.0019 |
| Meta ads | `job:ads.meta.search` | $0.00188 |
| LinkedIn ads | `job:ads.linkedin.search` | $0.00188 |
| Google results | `job:google.serp.organic` | $0.0009 |
| AI answer | `job:google.serp.ai-mode` | $0.002 |
| Authority | `job:backlinks.domain.summary` | $0.024 |

A typical run is 12 to 15 calls.

## Output format

Sections in this order: Snapshot (what they sell, to whom, price), Site map (path groups with counts), Positioning (headline, proof, call to action), Stack, Channels (ads, search, hiring), Gaps and angles, Ledger (claim, tag, run id or URL), Spent. Keep it to two pages.

## Failure handling

- A scrape returns a login wall, empty text or a bot block: say so, mark that page unknown, do not guess its content, and do not try to get around the block. Try `fallback` once.
- Empty site map (a single page app): read the home page and its links instead.
- An ads search finds nothing: write "none found in these libraries", not "no ads".
- Never log in to their product, fill forms or send anything. Read only.
- Balance too low: show the top-up link. Never pay for the user.

## Example

"Teardown example.com, compare with our pricing." Plan: map, scrape /pricing and /enterprise, technographics, jobs, Meta ads, three search terms. Quote: 13 calls. Result lines look like this:

- "The pricing page lists 4 plans and the free plan caps blocks." [observed, scrape run r2]
- "They run a Meta campaign that points at /templates." [observed, ads run r5]
- "They likely invest in template-led SEO." [inferred from the path group count and the ads]

The names and numbers here are illustrative.

## Related

`reverse-engineer` runs this skill as its phase 2.
