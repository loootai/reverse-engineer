---
name: request-provider
description: "When a provider, data source or endpoint is missing from looot, confirm the gap with several searches, then file a request to the looot team through looot's capability request route and, if the user agrees, a public GitHub issue on this repo. Use when the user says: looot does not have this, request a provider, request a data source, add this API to looot, this capability is missing, ask looot to support X, file a provider request, nothing in the catalog fits."
---

# Request a provider

When the looot catalog has no job for something you need, ask for it. Two steps: prove the gap is real, then file a request that a person can act on.

## When to use

- `rebuild-on-looot` marked a capability "missing".
- A search came back empty and the user wants the data anyway.
- Not for a wrong or empty answer from a job that exists. Send `feedback` with the run id for that.

## Inputs

- What is missing, in plain words.
- If known: the provider name, its docs URL, the endpoints wanted, and its public price.
- What the user is building and how many calls a month they expect.

## Step 1. Confirm the gap

Gaps reported after one search often exist under other words. Search at least four ways before you call something missing.

1. The task in plain words ("company from ip address").
2. The data returned ("company name, domain, employee count").
3. The provider's name, if you have one ("ipinfo"), to see what that provider already covers.
4. The source's own term ("reverse ip", "firmographics").
5. The job id words ("ip lookup", "company enrich").

Free reads, no sign-in:

- `node scripts/catalog-search.mjs "<phrase 1>" "<phrase 2>" "<phrase 3>"` from this skill's folder. It reads the catalog overview and the public catalog.
- Or `GET https://api.looot.ai/v1/public-catalog?q=<words>` and `GET https://api.looot.ai/v1/catalog/overview?depth=jobs`.
- Or the MCP tool `search_catalog` if looot is connected.

Sort the result into one of three:

- exists: a job or endpoint does it. Use it. Stop here and say which one.
- partly: it exists but needs another input, covers only some countries, or returns fewer fields. Say exactly what is short. Ask whether a request for the missing part is still wanted.
- missing: four or more phrasings found nothing that fits. Go on.

Record the phrasings you tried. They go in the request.

## Step 2. Try an alternative that is already in looot

Before asking for a new provider, check whether a job that exists can do most of it. Name the job, the gap that remains, and whether it is acceptable. The request should say "tried `job:<id>`, short because <reason>".

## Step 3. Write the request

Fill these fields. Keep it short and specific.

- Provider name, or "any provider".
- Provider docs URL.
- The endpoints wanted, one per line.
- Inputs the endpoint should take. Outputs it should return.
- The provider's public price, with the date you read it, or "unknown".
- What you are building.
- Expected calls per month.
- Alternatives tried (the job ids from step 2 and the phrasings from step 1).

Never include tokens, API keys, customer names, emails or other personal data. The GitHub issue is public.

## Step 4. Show the text and get a yes

Show the user the exact text you plan to send and where it goes. Wait for a yes. Do not file anything without one.

## Step 5. File it

### Route A. looot's capability request (documented)

looot documents a request route for exactly this case (https://docs.looot.ai/support and https://docs.looot.ai/mcp-tools/capability-request).

- MCP tool `capability_request`, or REST `POST https://api.looot.ai/v1/capability-requests` with the same fields. It needs a signed-in token.
- Fields: `title` (1 to 200 characters), `description` (1 to 2000 characters), optional `desiredInputs` and `desiredOutputs` (lists of field names), and `idempotencyKey` (required, stable per request, so a retry never files a duplicate).
- Map your text like this: `title` is "<capability>: <provider or any provider>". `description` holds what it should do, the docs URL, the public price, what you are building, the monthly calls, and the alternatives tried. `desiredInputs` and `desiredOutputs` hold the field names.
- Use a key such as `req-<provider>-<capability>`, lower case. Reuse it to retry. Use a new key for a different request.
- `GET /v1/capability-requests` lists the requests your workspace has filed.

Example body:

```json
{
  "title": "Browser to hashed email: any provider",
  "description": "Take a first-party visitor id and a consented IP and return a SHA-256 hashed email, with the supplier's consent basis. Tried job:ip.lookup, which returns the network owner and no person. Searched: hashed email, visitor identification, identity graph, deanonymize. Building a visitor identification tool. About 500 calls a month.",
  "desiredInputs": ["ip", "visitorId"],
  "desiredOutputs": ["emailSha256"],
  "idempotencyKey": "req-any-browser-to-hashed-email"
}
```

Say what you know about the result: the docs describe the route and its fields. They do not state a response time, and this skill makes no promise about one.

### Route B. A GitHub issue on this repo

Use this as well, or on its own when there is no looot token. It is public, so others can add a thumbs-up.

1. Search first. Do not open a duplicate.

   ```
   gh issue list --repo loootai/reverse-engineer --state all --search "<provider or capability> label:provider-request"
   ```

2. If a match exists, add a thumbs-up and a comment with your use case and monthly calls instead of a new issue. Only after the user agrees.

   ```
   gh api repos/loootai/reverse-engineer/issues/<number>/reactions -f content='+1'
   gh issue comment <number> --repo loootai/reverse-engineer --body "<use case and calls per month>"
   ```

3. If none matches, create the issue with the same headings as the issue form (`.github/ISSUE_TEMPLATE/provider-request.yml`):

   ```
   gh issue create --repo loootai/reverse-engineer --label provider-request \
     --title "Provider request: <provider or capability>" \
     --body-file <file with the text the user approved>
   ```

   The body uses these headings, in this order: Provider name, Docs URL, Endpoints wanted, Inputs and outputs, Public price, What you are building, Calls per month, Alternatives already tried in looot.

4. Without `gh`, give the user a prefilled link. Field ids are `provider`, `docs`, `endpoints`, `io`, `price`, `building`, `volume` and `alternatives`.

   ```
   https://github.com/loootai/reverse-engineer/issues/new?template=provider-request.yml&title=<url-encoded title>&provider=<url-encoded>&docs=<url-encoded>
   ```

   Keep the link under about 6000 characters. The user opens it and presses submit.

### What to tell the user afterwards

Say what you did and what is true:

- Route A put a request into looot's capability request list. The looot team reads those.
- Route B opened a public issue that the looot team reads.
- Neither route comes with a promise about whether or when the provider is added.
- Check the catalog again later with the same searches. Tell the user the job id if it appears.

## Failure handling

- No looot token: use route B and give the user the sign-in step. `claude mcp add --transport http looot https://api.looot.ai/mcp`, then sign in in the browser.
- `capability_request` fails with a validation error: shorten the title or the description to the limits and retry with the same key.
- A thumbs-up is refused (no `gh` login): give the user the issue link to react to.
- The provider turns out to exist under another name: stop, tell the user the job id, do not file.
- The user does not want to publish the request: use route A only. Do not post private details to the public issue.

## Example

Missing: "browser to hashed email" for a visitor identification tool. Phrasings tried: hashed email, visitor identification, identity graph, deanonymize. Result: endpoints that create a hash from a known person's email, and endpoints that take a hash and return a profile. None turns a browser or IP into a hash. The gap is real. Alternative tried: `job:ip.lookup`, short because it returns the network owner and no person. The user approves the text, route A files it with the key `req-any-browser-to-hashed-email`, and route B finds no open issue, so a new one is created. The user is told both are with the looot team and that no timing is promised.

## Related

`rebuild-on-looot` calls this skill for every capability marked missing.
