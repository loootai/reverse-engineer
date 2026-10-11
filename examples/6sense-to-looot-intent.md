# 6sense to looot-intent

Target: 6sense, account intent and buying-stage scoring. Rebuild: [looot-intent](https://github.com/loootai/looot-intent), a ranked list of accounts with an itemised score. Read on 2026-10-10.

This case has the thinnest evidence of the three. The facts about 6sense below come only from the looot-intent README and the audit report written for it. The 6sense product pages were not re-read for this write-up, so almost every mechanism step is tagged inferred or unknown. That is how the skill should read a thin case. It does not fill the gaps with guesses.

## The mechanism

1. The product collects signals about an account from several sources. [inferred] the README lists the sources 6sense has and the rebuild lacks: first-party visitor tracking, bidstream and keyword-research intent from third-party data pools, CRM sync, ad orchestration
2. It combines the signals into an intent score and a buying stage per account. [inferred] the README calls the category "account intent and buying-stage scoring". How 6sense weights signals is unknown
3. It lets a team rank accounts and act on them. [inferred] the CRM sync and ad orchestration features suggest it
4. Price. 6sense publishes no price for paid plans. It has a free plan with 50 credits a month. The only paid-plan figure found is a third-party estimate of about $25,000 a year, which is not a 6sense number. [observed for the free plan and the missing price, reported for the estimate] read 2026-10-10

Unknown: how 6sense builds its stages, which third-party pools it buys, and what its score is trained on.

## What the mechanism needs, and what looot has

The rebuild chose ten public signals in nine categories. All ten are covered by jobs. The rows below are what the real repo calls, with the list price from the README (public catalog, read 2026-10-10).

| Signal | Tag | looot job | Endpoint | List price |
|---|---|---|---|---|
| Hiring and job ads | inferred | `job:jobs.company` | `predictleads-companies-job-openings` | $0.0100 |
| Funding | inferred | `job:company.funding` | `predictleads-companies-financing-events` | $0.0100 |
| Company news | inferred | `job:company.news` | `predictleads-companies-news-events` | $0.0100 |
| Tech stack changes | inferred | `job:company.technographics` | `predictleads-companies-technology-detections` | $0.0100 |
| SEO movement | inferred | `job:keywords.domain.overview` | `dataforseo-dataforseo-labs-google-domain-rank-overview-live-ai` | $0.0120 |
| Web traffic | inferred | `job:company.traffic` | `datagma-website-traffic` | $0.06532 |
| Google ads | inferred | `job:google.company.ads` | `scrapecreators-google-company-ads` | $0.00188 |
| LinkedIn ads | inferred | `job:ads.linkedin.search` | `scrapecreators-linkedin-ads-search` | $0.00188 |
| Reddit mentions | inferred | `job:reddit.post.search` | `scrapecreators-reddit-search` | $0.00188 |
| Headcount growth | inferred | `job:company.workforce` | `companyenrich-companies-workforce` | $0.0490 |

The score is a design choice of the rebuild, not a copy of 6sense. Each enabled signal gets points out of 100 in proportion to its weight. Event signals decay with a half-life. Growth signals compare this run with the last one. A stage (aware, considering, deciding) needs a threshold and, for deciding, signal in at least 3 categories. Weights live in `config/intent.config.json`, and every score lists its signals, the provider, the weight and the cost of the call.

## What looot-intent dropped, and why

- First-party visitor tracking, bidstream and keyword-research intent pools, CRM sync, ad orchestration. 6sense has these. looot has no job that supplies them.
- A review signal from G2, Capterra or Trustpilot. The catalog has none.
- Google Maps and App Store reviews. They need a place id or an app id, not a domain.

## What was missing

Review sites (Trustpilot, G2, Capterra, Yelp) are the first gap in the audit report of the ten open-source alternatives, named by 4 of the 10 repos. The second is write-back to CRM and Slack, which is output wiring, not data. The audit report lists the review-site gap as a decision for the looot team. The sources I read do not record that a provider request was filed.

## Cost of a typical run

All ten signals cost $0.1720 per account at list price. 25 accounts cost $4.30 and 100 accounts cost $17.20. Web traffic and headcount are $0.114 of the $0.1720, so turning those two off drops the cost a lot. The README's dry run for 3 accounts prints $0.52 at list price. The audit report written earlier the same day lists $0.1765 per account, before one signal moved to a cheaper endpoint.

## Status of the rebuild

No paid looot run was made. Every response parser was written from provider docs and fixtures, and `shapeVerified` is false for all ten signals. The LinkedIn ads signal searches by company name and sends the first label of the domain, which can match the wrong company for common words. The README tells users to expect to adjust a parser after the first live run.

Repo: https://github.com/loootai/looot-intent
