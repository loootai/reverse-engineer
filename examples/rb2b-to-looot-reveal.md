# RB2B to looot-reveal

Target: RB2B, a website visitor identification tool. Rebuild: [looot-reveal](https://github.com/loootai/looot-reveal), a company-level visitor feed. Evidence read on 2026-10-11 from RB2B's pricing page, support articles, privacy policy and public script. No account was created, no script was installed on a live site, and no paid looot call was made.

## The mechanism

1. A visitor loads a page that carries RB2B's script. [observed] the snippet on rb2b.com
2. If the site uses a consent tool, the script waits for the visitor to consent. [observed for CookieYes in the script; other tools need manual setup per RB2B's support page]
3. The script asks a geo lookup service where the visitor is. Visitors outside the US and visitors behind a proxy get no person-level attempt. [observed] script text
4. The script calls LiveIntent and two other endpoints from the visitor's browser, with the visitor's own cookies. Each returns a hashed email if it knows this browser. [observed that it asks and stores the answer; the owners of two of the three endpoints are unknown]
5. The script sends the hashes, cookie ids and page URL to an RB2B server on AWS. [observed] script text
6. The server turns a hashed email into a name, LinkedIn URL and work email. [inferred] the server side is not public. RB2B names "verified professional data sources" and a related company, Retention.com, sells hashed-email lookups
7. Low-confidence matches are dropped, valid ones go to Slack, a CRM or a webhook, and one credit is used. [observed] RB2B support article
8. Company-level mode needs only an IP lookup. [inferred] one search summary names Demandbase as the source, which is reported by a third party and not read on RB2B's own page

Other things the script showed: a bot filter, a US geofence, no read of the Global Privacy Control signal. The script is obfuscated. The research decoded its string table in a local process and did not run the tracking logic. This pack's rule is stricter: do not execute any part of a vendor script. Decode base64 and similar encodings yourself.

Unknown after this pass: RB2B's subprocessor list, its terms text and its data processing addendum text.

## What the mechanism needs, and what looot has

| Capability | Tag | looot job | List price | Status |
|---|---|---|---|---|
| IP to network owner, ISP and VPN flags | observed | `job:ip.lookup` (`ipinfo-lite`, `ipinfo--2`) | $0, then $0.0005 per new IP | covered |
| IP to company, charged on a match | inferred | `job:ip.enrich` (`people-data-labs-ip-enrich`) | $0.28 per match | covered, off by default |
| Company profile from a domain | observed | `job:company.enrich` | from $0.0019 | covered |
| Country check before any person-level step | observed | `job:ip.lookup` through the free `ipinfo-lite` call | $0 | covered |
| Consent gate and Global Privacy Control | observed | none, own code | none | own code |
| Browser to hashed email (cookie network) | observed | none | none | missing |
| Hashed email to name, title, LinkedIn URL, company | inferred | `people-data-labs-person-enrich` takes an `email_hash` | $0.28 per match | partly covered, off by default |

The last row is partly covered because the catalog entry takes a hash, but nothing in the catalog produces the hash from a browser. Two other entries do not help. `aviato-person-email-hash` ($0.02) turns a known person's LinkedIn URL into hashes, which is the wrong direction.

## What looot-reveal dropped, and why

- Person-level identification is off by default. It needs the user's own hashes or the user's own supplier contract, a second consent, a US-only gate, and five ticked conditions on a setup page. looot supplies no person-level visitor identity and the repo ships with no supplier.
- Email finding. Not part of the visitor feed.
- A hosted multi-user mode. The app is local. Outside the demo its admin pages need a password.
- The browser-side calls to identity networks. The repo makes none. Everything runs on the user's server.

## What was missing

The front half of RB2B, a browser to a hashed email, has no job in the catalog as read on 2026-10-10 and 2026-10-11. The looot-reveal README tells users how to ask for a provider (the `capability_request` MCP tool, `POST /v1/capability-requests`, or the contact page) and lists IP suppliers that look worth asking for: ipgeolocation.io, Ipregistry, ipapi.is, MaxMind GeoIP2, ipdata and Abstract API. The sources I read do not record that a request was filed.

## Cost of a typical run

At list price with the defaults, 100 new IPs cost at most $0.05 to look up. If 15 of them are business networks, enrichment adds at most $0.0285, so about $0.08 in total. The worst case, every IP enriched, is $0.24. Repeat IPs and repeat companies are free. The dry run in the README for 3 new IPs prints a ceiling of $0.0072.

Turning People Data Labs IP enrichment on adds up to $0.28 per address that reaches it, which is why it is off.

## Status of the rebuild

No paid looot run was made. Parsing is built from IPinfo's public field list and from fixtures. Which fields the `ipinfo--2` plan returns depends on the IPinfo tier behind looot. The tracking snippet and the collect route have no rate limit and no load test.

Repo: https://github.com/loootai/looot-reveal
