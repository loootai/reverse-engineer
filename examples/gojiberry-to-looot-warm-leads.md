# Gojiberry to looot-warm-leads

Target: Gojiberry, a tool that finds warm B2B leads from LinkedIn signals and runs outreach. Rebuild: [looot-warm-leads](https://github.com/loootai/looot-warm-leads). Read on 2026-10-10. Sources: gojiberry.ai home page and blog index, plus review summaries from other vendors. Several of those are competitors, so they are direction and not fact. gojiberry.ai/pricing returned 404, so the price comes from the home page.

## The mechanism

1. The product finds "warm leads" from "15+ buying and social signals". [observed] home page
2. Named signals: competitor engagement, people who follow your company, people active in your space. [observed] home page
3. More signals: job changes, funding events, post interactions, lookalikes. [reported by review summaries, not on the pages read]
4. It scores leads against your ideal customer profile. [observed] home page
5. It runs personalised outreach on email and social channels, in full auto or with approval of each message. It drafts replies and keeps a unified inbox. [observed] home page
6. It claims to learn what converts and to benchmark campaigns. [observed as a claim, not verified]
7. Integrations: HubSpot, Pipedrive, an API and an MCP server. [observed] home page
8. Price: the Pro plan is $99 a month with 2 AI agents, up to 1,800 prospects contacted a month, a unified inbox, lead scoring, a Copilot mode and email enrichment from "15+ data providers". A Custom plan for teams of 3 or more has no public price. A free trial is advertised and its length is not stated. [observed] home page

Unknown: how Gojiberry gets its engagement data, which 15 email providers it uses, and what its conversion learning does.

## What the mechanism needs, and what looot has

The rebuild reads public-data providers through looot. It does not log in to LinkedIn, use a session cookie or automate a browser. Prices are list prices from the README (public catalog, read 2026-10-10).

| Capability | Tag | looot job | Endpoint | List price |
|---|---|---|---|---|
| Posts of a competitor page | observed | `job:linkedin.company.posts` | `scrapecreators-linkedin-company-posts` | $0.00188 |
| Posts of a creator | inferred | `job:linkedin.person.posts` | `harvestapi-profile-posts` | $0.004 |
| Posts matching a keyword | observed | `job:linkedin.post.search` | `harvestapi-post-search` | $0.004 |
| Comments and reactions on a post | observed | `job:linkedin.post.engagement` | `fetchin-post-engagement` | $0.003 |
| Profile: title, role start, location | inferred | `job:linkedin.person.profile` | `fetchin-profile` | $0.0015 |
| Company: industry, headcount, site | inferred | `job:linkedin.company.profile` | `fetchin-company` | $0.0015 |
| Hiring trigger, optional | reported | `job:jobs.company` | `predictleads-companies-job-openings` | $0.01 |
| Funding trigger, optional | reported | `job:company.funding` | `predictleads-companies-financing-events` | $0.01 |
| Work email find | observed | `job:people.email.find` | `anysite-api-linkedin-user-email` | $0.003598 |
| Email verify | observed | `job:people.email.verify` | `millionverifier-verify` | $0.00178 |

Job changes need no separate paid call. The role start date comes from the profile read. ICP scoring is own code. Fit is at most 40 points and intent at most 60, and the breakdown on a lead page lists every signal, its provider, weight, points, date, cost and evidence link. Weights are in `config/warm.config.json`.

## What looot-warm-leads dropped, and why

- Company followers. No endpoint in the catalog lists a company page's followers.
- Lookalike leads. Not built.
- Autonomous agents and full auto sending. Dropped on purpose. Every send needs the user's approval of the exact text.
- Learning from conversions, benchmarks, AI-drafted replies, a unified inbox, CRM sync. Not built.
- A 15-provider email waterfall. The rebuild uses one finder and one verifier, with the quote first.
- Hosted setup. The app is local, with a JSON state file and no login.

## What was missing

- Company followers: no catalog endpoint. The README names it as the one gap in the catalog.
- Messaging channel access. The catalog has no Unipile entry (checked 2026-10-10), so the optional LinkedIn sending calls Unipile directly with the user's own account and key, off by default.

The sources I read do not record that a provider request was filed for either gap.

## Cost of a typical run

For 3 competitor pages, 2 creators and 3 keywords, with the defaults (2 top posts per source, up to 60 profiles read), at list price and as an upper bound:

| Triggers | Upper bound per run |
|---|---|
| New role only (the default) | $0.25 |
| New role, hiring and funding for up to 20 companies | $0.65 |

Emails cost $0.0054 per lead at most and are always quoted separately. The README's dry run for one competitor page, one creator and one keyword prints an upper bound of $0.21.

## Status of the rebuild

No paid looot run was made and no Unipile call was made. Parsers come from endpoint docs and fixtures. A parse that finds nothing is reported as no data, not as a failure. No Instantly import was tried. LinkedIn sending is off by default and sending volume stays the user's responsibility under LinkedIn's terms.

Repo: https://github.com/loootai/looot-warm-leads
