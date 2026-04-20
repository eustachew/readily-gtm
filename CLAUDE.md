# Readily — Warm Intro Engine

## What this is
Take-home for a GTM role at Readily (AI for healthcare compliance). The app ingests a list of advisors and a list of target organizations, then returns a ranked list of warm-intro paths — real people at the targets, their role, LinkedIn URL, and how likely the advisor can introduce us.

Evaluators are judging **GTM judgment** alongside code. Every visible choice should signal understanding of how healthcare deals actually close. Depth beats surface area.

## Inputs
Two inputs, both flexible:
- **Advisors** — textarea (one per line, `Name, Organization` format) OR CSV upload
- **Targets** — textarea (one org name per line) OR CSV upload

CSV upload populates the textarea, so internally there's one code path. Sample CSVs are in the brief for testing.

## Output
CSV matching the sample exactly. Columns: `Advisor Name, Target Organization, Target Name, Target Role, Target LinkedIn`. The brief's prose mentions "email" but the sample shows LinkedIn URL — we match the sample.

## Stack
Next.js 15 App Router · TypeScript · Tailwind · shadcn/ui · Anthropic SDK with web_search tool · deployed to Vercel. Server-side Claude calls only (never expose the API key to the client).

## Build order
Ship after each step. Don't save deploy for the end.

1. **Working end-to-end.** Scaffold, paste/upload inputs, call Claude with web_search to find compliance decision-makers per target, render results in a table, export to CSV. Plain UI. Deploy.
2. **GTM craft.** Match-quality score shown prominently. Verifiability state (verified / likely / inferred) visible per row. Reasoning column citing a specific signal. "Draft intro request" button that generates an email to the advisor plus a forwardable blurb. Deploy.
3. **Visual polish.** Apply the `visual-design` skill. Editorial typography, single accent color, clean loading and empty states. Deploy.
4. **Narrative.** README in your voice, 2-minute Loom walkthrough, clean git history.

## Success criteria
1. Evaluator uploads or pastes inputs → sees ranked matches in under 30s
2. Each row shows score, ICP rationale, and a one-click intro draft that the advisor would actually forward
3. Export CSV matches the sample format exactly
4. Live on Vercel, visual quality reads as Series-A startup (not hackathon)

## Conventions
- Domain types in `lib/types.ts`, no `any`
- User-facing copy in `lib/copy.ts` (so GTM tone is editable in one place)
- API routes in `app/api/*/route.ts`

## Guardrails
- No LinkedIn scraping (ToS, wrong signal for a compliance buyer)
- When Claude is uncertain, the UI says so — empty rows or "low confidence, verify manually" beats fabricated contacts
- The `readily-gtm` skill auto-loads when relevant (ICP, personas, email craft, scoring) — don't re-paste that context in prompts
- The `visual-design` skill auto-loads for UI work
