---
name: claims-audit
description: "Audit a report, lead list, outreach draft, pitch, post or market brief for claims that no source backs up, then list the unknowns and the cheapest looot call that would settle each. Use when the user says: audit this report, check my claims, fact-check this, what am I assuming here, is this lead list real, verify before I send, find the weak spots in this brief, what do we not know yet, residual unknowns."
---

# Claims audit

Find the assumptions in a document, price the checks, and fix what is cheap. Separate what was observed from what was assumed.

## When to use

- Before sending outreach that states facts about the recipient ("saw you raised a Series A").
- Before trusting an enriched lead list, a market size slide, a competitor claim, or your own reverse engineering report.
- Not for tone or copy editing.

## Inputs

- The document: pasted text, a file path (CSV, markdown, text) or a sheet export.
- Optional: the audience and a budget cap. Default cap $0.25, never more than $0.02 per claim.

## Procedure

1. Extract claims. List every statement that can be true or false: company facts (size, funding, location, tech), person facts (role, employer, email), market numbers, dates, quotes. For a list of rows, treat each field of each row as a claim, but sample (see step 5).
2. Tag each claim with its basis:
   - sourced: a link or run id is attached.
   - recalled: it came from memory or an old tool.
   - assumed: nothing stands behind it.
   - stale: sourced, but older than 90 days.
3. Rank by damage if wrong. Top: facts about a recipient in a message, an email address that will be sent to, any number in a pitch. Low: color, opinion.
4. Map each top claim to the cheapest job that could settle it (table below).
5. Quote. Confirm each job with `search_catalog` or the public catalog, then `inspect` (free, needs a sign-in). For lists over 30 rows, check a random sample of 10 first and extrapolate the error rate. Check everything only if the user says yes. Show: "12 checks, about $0.03, cap $0.25." Wait for a yes above $0.10 or above 100 calls. There is no dry-run call. Inspect is the quote.
6. Run each check with a fresh `idempotencyKey`, `fallback: true` and `maxCostUsd`. Read `status` and `outcome`. A miss means "not confirmed", not "false".
7. Reclassify each claim as confirmed (run id), contradicted (show the new value and run id) or still unknown. Edit the document only after showing the diff, and keep the original.
8. Report the error rate on the sample and what it implies for the rest of the list.

## Jobs (catalog revision 101897, read 2026-10-11; inspect shows the live price)

| Claim type | Job | From, per call |
|---|---|---|
| Email still valid | `job:people.email.verify` | $0.00145 |
| Company size, industry, location | `job:company.enrich` | $0.0019 |
| Person's role and employer | `job:linkedin.person.profile` | $0.0012 |
| Company page data | `job:linkedin.company.profile` | $0.0015 |
| Tech stack claim | `job:company.technographics` | $0 |
| Hiring claim | `job:jobs.company` | $0.01 |
| News or funding claim | `job:news.search` | $0.00099 |
| A quote or fact on a page | `job:web.scrape.markdown` | $0.0002 |
| A claim with no obvious job | `job:web.search` | $0 |

## Output format

```
# Claims audit: <document>
Claims found: <n>. Confirmed <a>, contradicted <b>, unknown <c>, not checked <d>.
Spent $<x>.
## Fix before sending
| Claim | Problem | Replacement | Evidence |
## Still unknown (cheapest check)
| Claim | Job | Price | Worth it |
## Sample error rate
<k of n wrong>. Expect about <p percent> of the unchecked rows to be wrong.
```

## Failure handling

- A contradiction: never overwrite silently. Show old, new and run id.
- A miss from the only provider: leave it unknown and name the jobs tried.
- An opinion: mark it "not checkable" and move on.
- Personal data of private people: check work facts only, keep results out of chat if the document is sensitive, and never send anything.
- Over cap: stop and report what is left unchecked.

## Example

A pasted 20-row lead list with emails, titles and "recently raised" notes has 60 claims. The top risks are 20 emails and 20 funding notes. Sample 10 rows: 10 email verifies and 10 news searches. Result: 2 of 10 emails invalid, 4 of 10 funding notes unsupported. Report: "Expect 4 invalid emails and 8 unsupported notes in the full list. Verifying the other 10 emails costs about $0.015. Remove the funding line from the rows where no source was found."

The numbers here are illustrative.

## Related

`reverse-engineer` runs this skill as its phase 6.
