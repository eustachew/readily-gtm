---
name: readily-gtm
description: "Load this skill whenever the task involves Readily's product, ideal customer profile, buyer personas, healthcare compliance context, connection scoring, advisor-to-target matching, intro-email drafting, or any judgment call about what will resonate with a healthcare GTM audience. Trigger aggressively — applies to UI copy, feature prioritization, scoring heuristics, email templates, README framing, and the system prompt for the Claude-powered matcher. If the task touches Readily's buyers or how warm intros work in healthcare, load this."
---

# Readily GTM

The Readily team is grading this take-home. Every visible choice in the app is a signal about whether the candidate understands how Readily actually sells. This skill is the briefing document.

## What Readily is (one breath)

AI platform that connects a healthcare organization's internal policies to external regulations. Surfaces what's affected when a new rule drops, which policies need to change, and helps compliance teams prep audits — cutting regulatory work by up to 90%.

The wedge is **pain, not pleasure**: regulations grow ~30% a year, fines reach $55M, compliance teams manually review 100k+ page document sets. Existing tools are Excel and PDF search.

## ICP

**Organizations:**
- Health plans — especially Medicaid Managed Care, Medicare Advantage, D-SNPs (heaviest regulation)
- Integrated Delivery Networks and large hospital systems
- Risk-bearing provider groups, ACOs
- PBMs, specialty pharmacies, DME providers (CMS-heavy segments)

The example targets (L.A. Care, CalOptima, San Francisco Health Plan) are all **California Medicaid managed care plans** — a tight, networked segment. If inputs cluster geographically or by segment, lean into that concentration in the UI rather than treating it as random.

**People (priority order):**
1. **Chief Compliance Officer (CCO)** — economic buyer at most targets. Reports to CEO or General Counsel. Risk-averse; buys on peer reference and ROI.
2. **Chief Regulatory Affairs Officer / VP Regulatory Affairs** — sometimes combined with CCO (note: example target "Chief Compliance and Regulatory Affairs Officer"). Owns state DMHC / CMS / DHCS relationships.
3. **VP / Senior Director of Compliance** — operational evaluator. Gets sold to, then brings CCO in.
4. **Director of Regulatory Affairs / Compliance Delegation Oversight** — champion-level. Feels the pain daily.
5. **Chief Audit Executive / VP Internal Audit** — adjacent, sometimes consolidated with compliance.

**Secondary:** General Counsel (signs off, rarely leads), CMO (only for clinical-policy deals).

**NOT the buyer:** CEO/CFO/COO (too senior, deflect to CCO), HR, clinical roles.

## Persona nuances that signal GTM maturity

- CCOs come from **law or audit** backgrounds. They respond to "audit-ready," "defensible," "evidence trail." They're suspicious of "AI magic," "automated decisions," "ChatGPT for compliance."
- Regulatory Affairs leaders care about tracking rule changes (CMS memos, DMHC APLs). "Never miss a reg update" resonates.
- Directors of Compliance Delegation Oversight deal with delegated entities — very specific pain. If the target has this title, mention delegation in the intro.
- California plans face DMHC + DHCS + Covered California on top of CMS — most over-regulated plans in the country, which is why they're an early ICP.

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

## Multi-path matches

When two advisors reach the same target:
- Group into one row
- Rank paths by connection_strength
- Default the "draft intro" action to the strongest path
- Mention the alternative in the intro ("If you're not close to Albert, Aditi also knows him")

## Intro email craft — the highest-leverage component

The email is sent **to the advisor**, not the target. The advisor reads it, maybe edits, forwards.

### Structure (5 lines max, plus a forwardable block)

1. **Acknowledge** the relationship
2. **The specific ask** — name, company, role, one sentence
3. **The why** — one line on why this target matters
4. **The ease** — forwardable blurb below, so advisor can paste without rewriting
5. **Escape hatch** — "no worries if you don't know them well enough"

### The forwardable blurb (separate block)

Must stand alone, sound like the advisor wrote it, do the advisor a favor (make them look thoughtful).

- **Context** (why the advisor is sending): 1 line
- **Credibility** (why Readily is worth time): use ICP talking points; name customer logos if available
- **Specific hook for THIS target**: a fact about their organization (recent APL, public initiative, known pain)
- **Low-commitment CTA**: "15 min to compare notes" — never "demo" on first touch

### Tone calibration by persona

- **CCO**: serious, ROI and risk reduction, peer customer logos
- **VP/Director Compliance**: more tactical, daily workflow pain (APL tracking, policy crosswalks)
- **Director of Delegation Oversight**: ultra-specific — mention delegated-entity audits
- **Chief Regulatory Affairs**: lead with reg tracking and audit readiness

### Intro email failure modes

- Sounds AI-generated ("I hope this email finds you well" → bin)
- Generic value prop (compliance leaders see 20/week)
- Over 120 words in the forwardable — dead on arrival
- Asks for a demo not a conversation
- Fabricates familiarity ("as you know…" when advisor doesn't)

## Talking points that resonate

- "Cut compliance work by up to 90%"
- "Audit-ready evidence in hours not weeks"
- "Keep up with 30% annual reg growth without adding headcount"
- "Know which policies are affected the moment a new APL or CMS memo drops"

## Talking points that flop

- "Revolutionary AI" — compliance people distrust hype
- "10x productivity" — engineer-speak
- "Move fast" — terrible positioning for a risk-averse buyer
- Anything that makes compliance sound unserious

## System prompt for the matcher

When calling Claude from `/api/match`:
1. **Mission**: find 1–3 compliance/regulatory decision-makers at each target org who fit the personas above
2. **Tool use**: web_search to verify each person exists at the org in that role; include LinkedIn URL if found in public results
3. **Abstention rule**: if <1 person can be verified, return empty array with a `notes` field explaining what was searched
4. **Connection signals**: web_search for overlap between advisor and target (past employers, schools, conferences, publications); produce a `connection_rationale` citing specifics or explicitly admitting absence
5. **Anti-fabrication**: skip uncertain names. Empty row beats invented one.
6. **Output**: strict JSON matching the types in `lib/types.ts`

## Copy calibration

Would a 50-year-old General Counsel at a Medicaid plan read this without rolling their eyes? That's the bar.
