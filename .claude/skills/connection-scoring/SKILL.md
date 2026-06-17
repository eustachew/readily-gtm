---
name: connection-scoring
description: "Use this skill when scoring how strongly an advisor can introduce us to a target — the 0–100 connection-strength rubric, the matchScore formula, public overlap signals (shared employer, school, conference, publication), verifiability tiers (verified/likely/inferred), or ranking multiple paths to the same target. Load during the scoring stage. If the task is about HOW STRONG a connection is or how to compute/display the score, load this."
---

# Connection Scoring

Covers the scoring stage: turning an advisor↔target pair into a defensible number, with honest uncertainty surfaced. For WHO to score against, see [[readily-icp]].

## Scoring framework

```
match_score = icp_fit × connection_strength × verifiability

icp_fit: 1.0 (primary persona), 0.6 (secondary), 0.25 (weak)
connection_strength: 0–100 (see signals below)
verifiability: 1.0 (web-corroborated w/ source), 0.75 (likely), 0.4 (inferred)
```

Show the score prominently in mono font. Never hide the verifiability component — surfacing uncertainty is itself a GTM signal of product maturity.

## Connection strength signals

Score 0–100 based on signals a public web search can actually surface.

**Strong (30+ pts each):**
- Shared past employer (especially Kaiser, Anthem, Blue Shield, a regulator, Big Four healthcare practice)
- Same alma mater + same graduation window (±3 years)
- Co-authored publication, co-panelist, co-board member
- Same current city + same sub-industry (CA healthcare compliance is a small world)

**Medium (10–20 pts each):**
- Same trade association (HCCA, AHIP, CAHP, NAMD, AHLA)
- Same conference attendance (HCCA Compliance Institute, AHIP Institute, RISE Nashville)
- Shared second-degree connection inferable from public org charts

**Weak (≤10 pts):** same LinkedIn-public group, same broad region, same career seniority.

**Not signals:** "Both on LinkedIn," "Both in healthcare," "Both Americans."

If search returns nothing specific, return connection_strength ≤15 with `verifiability: "inferred"` and a rationale that names the absence. Do not invent overlap.

## Matcher: scoring the connection (the scoring half of `/api/match`)

web_search for overlap between advisor and target (past employers, schools, conferences, publications); produce a `connection_rationale` citing specifics or explicitly admitting absence. Skip uncertain claims — an honest "no public overlap found" beats a fabricated tie.

## Multi-path matches

When two advisors reach the same target:
- Group into one row
- Rank paths by connection_strength
- Default the "draft intro" action to the strongest path
- Mention the alternative in the intro ("If you're not close to Albert, Aditi also knows him") — see [[intro-craft]]
