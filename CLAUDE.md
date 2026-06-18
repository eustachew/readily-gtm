# Readily — Warm Intro Engine

## What this is
Take-home for a GTM role at Readily (AI for healthcare compliance). The app ingests advisors and target organizations, then returns a ranked list of warm-intro paths — real people at the targets, their role, LinkedIn URL, and how likely an advisor can introduce us. Evaluators judge **GTM judgment** alongside code; depth beats surface area.

## Stack
Next.js 15 App Router · TypeScript · Tailwind · shadcn/ui · Anthropic SDK with web_search. Server-side Claude calls only — never expose the API key to the client. Deployed to Vercel.

## Run
- `pnpm dev` — local dev server
- `pnpm build` — production build
- Deploy: push to `main` (Vercel auto-deploys). Ship after each slice, not at the end.

## Hard guardrails
- **No LinkedIn scraping** (ToS, and the wrong signal for a compliance buyer).
- **Abstain over fabricate** — when Claude is uncertain, the UI says so. Empty rows or "low confidence, verify manually" beats invented contacts.
- **Output a LinkedIn URL**, not email. CSV columns match the sample exactly: `Advisor Name, Target Organization, Target Name, Target Role, Target LinkedIn`.

## Conventions
- Domain types in `lib/types.ts`, no `any`. User-facing copy in `lib/copy.ts`. API routes in `app/api/*/route.ts`.

## Where everything else lives (load on demand)
GTM knowledge is split into four skills, each loading only for its pipeline stage:
- **readily-icp** — discovery: ICP, buyer personas, what compliance leaders care about, talking points.
- **connection-scoring** — scoring: connection-strength signals, verifiability tiers, the matchScore formula.
- **apl-timeliness** — the "why now" layer: mapping DHCS APLs to an org, urgency scoring, readiness checklist, APL-as-compelling-event hook.
- **intro-craft** — drafting: intro-email structure, forwardable blurb, tone by persona.

Finished/superseded notes live in `.claude/archive/` (git-tracked, but `.claudeignore`'d so they don't auto-load). Ask if you want them.
