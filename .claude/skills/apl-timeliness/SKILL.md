---
name: apl-timeliness
description: "Use this skill when working with regulatory timeliness — mapping California DHCS All Plan Letters (APLs) to a target org, scoring how urgent an APL is, building a readiness checklist from an APL, or folding a dated APL into the intro as the compelling event. Load during APL discovery (the matcher's APL prompt), timeliness scoring, and the drafting stage whenever an APL grounds the hook. If the task is about WHY NOW — the regulatory trigger that makes an intro timely — load this."
---

# APL timeliness — the compelling event

A warm intro converts on timing. The single biggest driver of whether a compliance leader takes the call is a **compelling event**: a concrete, recent reason this is the moment. For a California Medi-Cal managed care buyer, that event is a new **All Plan Letter (APL)** with a live deadline. This skill is the "why now" layer; for who to reach see [[readily-icp]], for which path see [[connection-scoring]], for the intro itself see [[intro-craft]].

## What an APL is

Formal guidance California's DHCS issues to Medi-Cal managed care plans (format `APL YY-NNN`). Each carries an issue date, usually several dated obligations (effective date, P&P/attestation submission deadlines, phase-ins), and a defined set of affected plans. Published as PDFs at dhcs.ca.gov.

## Mapping APLs to an org (discovery)

- Establish the org's lines of business first (full-scope MCP? D-SNP? dental carve-out? which counties?). An APL only applies if it binds the org's lines.
- Read the **actual PDF body**, not search snippets — the operative deadlines live deep in the document. (Implementation note: snippets miss them and the DHCS site is WAF-protected; the app reads PDFs via Anthropic's `web_fetch_20250910` tool.)
- **Abstain over fabricate, harder than anywhere else.** A made-up APL number or deadline in front of a compliance buyer ends the deal. No citation → omit. No readable date → never reconstruct from memory.

## Scoring urgency (timeliness ≠ connection strength)

Keep urgency on its own axis — it answers "should we reach now," not "can we get in." Urgency = the stronger of:
- **Deadline proximity** of the nearest upcoming obligation (≤30d hot, 31–90d warm, 91–180d cool).
- **Issuance recency** — a freshly issued APL is itself the trigger ("this just dropped and affects you") even with no hard deadline.

Resolve relative deadlines ("within 90 calendar days of release") into absolute dates off the issue date — these are often the most imminent.

## Using an APL as the intro hook

When a specific APL is in hand, it IS the forwardable blurb's hook:
- Name it by number and what changed, in plain language: "DHCS just dropped APL 26-005 on maternity services."
- Anchor on the nearest deadline as date + countdown: "plans have until June 23 to get updated P&Ps in."
- Tie to Readily's wedge: knowing which internal policies the new APL touches the day it lands, instead of a manual 100k-page crosswalk.
- If the deadline has passed, frame as "the dust is still settling on APL XX-XXX" rather than a countdown.

## The readiness checklist

A short, concrete compliance-readiness checklist for the APL — a useful artifact the advisor's contact would thank them for, not marketing.
- 4–6 items, each a concrete action (map affected policies, update P&Ps, file attestation, amend network agreements, assign an owner).
- Nearest-deadline items first; attach the ISO due date to each dated item.
- Every dated item comes from the APL's actual key dates — never invent a date or a requirement.
- Verb-first, under ~15 words each.
