---
name: visual-design
description: "Use this skill whenever building, styling, or polishing any UI for this project — pages, components, copy, layouts, colors, typography, data tables, cards, empty states, loading states. Trigger for any task that renders pixels. This skill enforces an editorial, trustworthy, B2B-healthcare-credible aesthetic and steers away from generic 'AI startup' visuals. Load it before writing JSX, choosing fonts or colors, or laying out a screen."
---

# GTM Visual Design

The goal: a UI that reads as **Series-A healthcare fintech**, not "built in an afternoon." The Readily team will grade partly on whether this feels credible in the hands of a compliance buyer — so the visual target is Attio / Vercel / Linear / Pitch, not a generic Tailwind landing page.

## Design direction: "Editorial Restraint"

- Feels like a financial terminal had a kid with a New Yorker article
- Information-dense without being cluttered
- High contrast, mostly neutral, one strong accent
- Feels slow on purpose — no jitter, no bouncy animations, no gradient bars racing across the screen
- A compliance officer should feel this was built for them, not for a pitch deck

## Typography

**Do not use Inter.** Every AI-built demo uses Inter. Instant giveaway.

Pair a distinctive body font with a mechanical/monospace accent:
- Body: `Instrument Sans`, `Geist`, `Söhne`, or `IBM Plex Sans` (all free via Google Fonts or rsms.me)
- Display / headings: `Instrument Serif` or `Fraunces` (adds editorial gravitas — fits healthcare/legal audience)
- Mono accent (numbers, IDs, scores): `JetBrains Mono`, `Geist Mono`, or `IBM Plex Mono`

Load in `app/layout.tsx` via `next/font/google`. Apply through CSS variables + Tailwind config.

Type scale: stick to 6 sizes max. Headings should be tight leading (`leading-tight` or `leading-none`) with generous letter-spacing tightening on serifs (`tracking-tight`).

## Color

Commit to one palette. Suggested:

- `--background`: `#fafaf8` (warm off-white) or `#0b0b0c` (near-black) if going dark
- `--foreground`: `#0a0a0a` / `#ededed`
- `--muted`: `#6b7280` or a specific warm gray
- `--accent`: **one** color only. Options that work for healthcare compliance:
  - Deep teal (`#0d7377`) — clinical but not cold
  - Oxidized green (`#2d5a3d`) — trust
  - Ink navy (`#1a2b4a`) — formal
  - Rust (`#a84d2c`) — editorial warmth
- `--confidence-high`: muted green (not neon)
- `--confidence-low`: muted amber (never red-alert; this is a productivity tool)

Use accent at ≤5% of screen area. Over-accenting is the #1 tell of AI-generated UI.

No purple gradients. No emoji for decoration. No glassmorphism. No neon.

## Spatial rules

- Base unit: 4px. Use multiples (4/8/12/16/24/32/48) — no arbitrary paddings
- Page max-width: 1280px for app views, 720px for reading content (READMEs, docs)
- Dense tables should use 12px row padding, not the default 16px
- Use hairline borders (`border` at 1px in low-saturation neutrals) instead of heavy shadows

## Components that carry the demo

### The match row (most important component)

This is what evaluators will look at longest. Get it right.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Score: 87]  Edward Tiong → L.A. Care                          │
│               Albert Aguilar · Sr Director, Compliance Deleg…   │
│               [VERIFIED] · Shared: 2019 HCCA Compliance Inst.   │
│                                                                  │
│               [Draft intro request]  [View reasoning]            │
└─────────────────────────────────────────────────────────────────┘
```

Key choices:
- Score rendered in **mono font**, big, left-aligned — it's the headline number
- Advisor → target as a single-line path (unicode arrow, not an emoji)
- Role in muted color, truncated with tooltip
- Verifiability badge uses a small, quiet indicator — not a loud green pill
- Connection rationale as a subtle line, not a paragraph
- Primary CTA is "Draft intro request" — action-oriented, not "View details"

### Coverage bar (top of dashboard)

```
23 of 50 targets reachable          ████████████░░░░░░░░  46%
```

- Progress bar in mono font, numbers in a larger size
- Subtext: "27 unreachable targets could benefit from recruiting advisors at [...]"

### Empty states

Never show "No data." Always show a **prompt for the next action**.
Example: "Upload an advisors CSV to see who on your network can open doors at the 3 California health plans in your target list."

### Loading states

Avoid spinners. Use a progress indicator that shows what's actually happening:
- "Finding compliance decision-makers at L.A. Care..."
- "Checking connection signals between Edward and Albert..."

This also masks latency by making it feel like work is happening, not like the app is broken.

### Tables

Use `@tanstack/react-table` or shadcn's `Table` primitive. Sortable columns (default sort: match score desc). Sticky header. Zebra striping OFF (looks dated). Row hover = subtle background tint only.

## Microcopy that signals GTM maturity

- "Reachable" (not "Matched")
- "Draft intro request" (not "Generate email")
- "Verifiability: Likely" (not "Confidence: 75%")
- "Network gaps" (not "No matches found")
- "Advisor network coverage" (not "Coverage score")
- Button: "Ship to CSV" or "Export results" (not "Download")

## What will kill the demo visually

- Default shadcn card with default shadow — looks like every other demo
- Inter + purple accent — peak AI-slop
- Bouncy/spring animations on hover — compliance buyers don't want toys
- Emoji anywhere in the app UI (README/docs: fine to use one sparingly)
- "Powered by AI ✨" badges
- Rainbow confidence indicators (red/yellow/green traffic lights)
- Centered single-column layouts for data-heavy screens

## The 30-second test

Open the deployed URL, take a screenshot, send it to a friend with no context, ask: "Does this look like a product you'd pay for?" If the answer isn't an immediate yes, iterate before shipping.
