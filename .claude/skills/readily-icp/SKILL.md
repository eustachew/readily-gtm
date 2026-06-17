---
name: readily-icp
description: "Use this skill when discovering or qualifying people at a target organization — identifying compliance/regulatory decision-makers, judging ICP fit, ranking persona priority, or deciding what a healthcare compliance buyer actually cares about. Load during the discovery stage of matching, and whenever writing UI copy, talking points, or the matcher's people-finding prompt. If the task is about WHO to reach at a target and WHY they fit, load this."
---

# Readily ICP & Personas

The Readily team is grading this take-home. Every visible choice signals whether the candidate understands how Readily sells. This skill covers the discovery stage: who to find at a target and why they fit.

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

## Matcher: finding people (the discovery half of `/api/match`)

1. **Mission**: find 1–3 compliance/regulatory decision-makers at each target org who fit the personas above
2. **Tool use**: web_search to verify each person exists at the org in that role; include LinkedIn URL if found in public results
3. **Abstention rule**: if <1 person can be verified, return empty array with a `notes` field explaining what was searched
4. **Anti-fabrication**: skip uncertain names. Empty row beats invented one.
5. **Output**: strict JSON matching the types in `lib/types.ts`

For scoring the advisor↔target connection, see [[connection-scoring]]. For the intro email, see [[intro-craft]].

## Copy calibration

Would a 50-year-old General Counsel at a Medicaid plan read this without rolling their eyes? That's the bar.
