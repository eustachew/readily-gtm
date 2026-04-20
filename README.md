# Readily Take-Home — Claude Code Workspace

Four files: one project constitution, two skills, this README.

## Setup

```bash
# Scaffold Next.js
pnpm create next-app readily-gtm --ts --tailwind --app --import-alias "@/*"
cd readily-gtm

# Copy CLAUDE.md and .claude/ folder from this bundle into the project root

# Install dependencies
pnpm add @anthropic-ai/sdk papaparse clsx tailwind-merge lucide-react
pnpm add -D @types/papaparse

# Initialize shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card table badge textarea tooltip dialog

# Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# Open Claude Code
claude
```

## First prompt

Don't just say "build the app." Paste this:

> Read CLAUDE.md. Then propose a focused plan for step 1 of the build order — working end-to-end. Keep it under 150 words. Don't write code yet.

That loads your constitution, forces Claude to commit to a plan, and gives you a chance to adjust before code is written.

## How it works

- `CLAUDE.md` loads every session. It's deliberately lean — project identity, build order, guardrails.
- The `readily-gtm` skill auto-loads when Claude detects work on ICP, personas, scoring, or email drafting. You don't need to re-paste context.
- The `visual-design` skill auto-loads when Claude is building UI. It steers away from generic shadcn defaults.
- Use `/clear` between build steps (not `/compact`). Clear preserves skill auto-loading; compact loses nuance.
- Use plan mode (Shift+Tab twice) for anything multi-step — it uses a cheaper model for repo scanning.

## What's not in the workspace

No subagents, no slash commands, no separate spec file. If friction shows up — say the same GTM review happens three times manually — add the thing back. Don't add it preemptively.

## Things to do yourself (not Claude)

1. **Write the final README in your voice.** Lead with the insight, not the tech stack. Claude can draft, you edit.
2. **Record a 2-minute Loom.** Single highest-leverage artifact. Script: hook → flow → one standout feature → V2 vision sentence.
3. **Read the first intro-email template Claude produces out loud.** It will sound slightly AI-generated. Edit until it doesn't.
4. **Stop adding features when the Loom feels confident.** Without a time cap, this is the new risk.
