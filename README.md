# Readily Warm Intro Engine

A tool for turning a list of advisors and a list of target healthcare orgs into a ranked set of warm-intro paths — with the intro email already drafted.

**Live:** https://readily-gtm-project.vercel.app

## Try it

Paste these inputs on the live URL:

**Advisors**
Edward Tiong, Readily
Aditi Gaur, Readily

**Targets**
L.A. Care
CalOptima
San Francisco Health Plan
Acme Fake Health Plan

Click **Find warm intros**, wait ~60s. Things worth looking at once it loads:

- The **Priority** column (High/Medium/Low/Gap) — headline triage
- **Hover any score pill** to see exactly how the number was built (ICP fit × connection strength × verifiability)
- **Hover the Verified badge** to see the actual source URLs that corroborated each person
- **Click Draft intro** on a row — it generates the email to the advisor *plus* a separate forwardable blurb written to sound like the advisor wrote it, not the product
- Scroll to the top — the Acme Fake Health Plan row shows what happens when you give it a made-up target. It returns nothing and explains what it searched, instead of fabricating contacts.

## How it thinks

Three layers, and the reasoning is visible — nothing is a black box.

**Discovery.** For each target org, Claude runs real web searches to find compliance/regulatory decision-makers. Every person returned has at least one corroborating source URL. If the org doesn't exist or no one can be verified, the row returns empty with a short explanation — the abstention rule is the most important thing in the product.

**Scoring.** Each (advisor × person) pair gets a match score built from three components:
- **ICP fit** — is this person one of Readily's actual buyer personas? (CCO, VP Compliance, Director of Compliance Delegation Oversight, etc.)
- **Connection strength** — how much concrete overlap is there between the advisor and the target person in public data? Shared employers, schools, trade associations (HCCA, AHIP, CAHP), conference co-appearances, publications.
- **Verifiability** — how well can we actually corroborate this from sources? Verified / Likely / Inferred.

**Priority triage.** Scores map to High / Medium / Low / Network gap. Rows don't disappear when they're weak — they get labeled honestly so you can see what the network *can't* reach and why.

The Network gap state is the one feature I'd point to as the most "GTM" thing in the product. When no advisor has a viable path to a target, the row tells you what kind of advisor you'd need to recruit to unlock it ("this one needs a Medi-Cal MCO compliance leader from SCAN or Molina in your network"). Turns a gap from a tool failure into a recruiting TODO.

## What I deliberately didn't build

- **No LinkedIn scraping.** Against ToS, not possible
- **No email enrichment.** The output spec is LinkedIn URL, not email. Guessing emails (`first.last@company.com`) without verification is the kind of thing a compliance team would flag as reckless — and the intro-draft flow goes through the advisor, so email isn't needed to make the intro happen anyway.
- **No paid data APIs in V1.** Proxycurl / Apollo would sharpen the data quality, but I wanted to prove the prioritization idea first on free web search before adding infrastructure. If the core flow works, plugging in a provider later is an afternoon.
- **No database, no auth.** Single-session tool.

## V2, if this became real

- Proxycurl or Apollo integration for authoritative LinkedIn URLs and richer profile data (current state uses public web search, which occasionally falls back to a search URL instead of a direct profile)
- **Advisor briefing mode** — generate a weekly 1:1 prep doc per advisor with the intros you're asking for, talking points, and watch-outs. Models how a GTM team actually runs this instead of querying it.
- Persona-specific intro templates that tune tone per role (CCO reads differently from a Director of Delegation Oversight)
- CRM write-back (HubSpot, Salesforce) so intro-requested -> intro-sent -> meeting-booked is instrumented
- Caching and streaming for larger runs - today each target is a Claude call with web search, which is ~$0.15–0.20/target

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Anthropic SDK with web_search tool · deployed on Vercel. Sonnet 4.6 for discovery and intro drafting; Haiku 4.5 for connection scoring. Results cached in localStorage by input hash so identical inputs don't re-run.

## Run locally

```bash
pnpm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
pnpm dev
```

---
