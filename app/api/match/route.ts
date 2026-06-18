import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  CONNECTIONS_SYSTEM_PROMPT,
  MATCHER_SYSTEM_PROMPT,
  buildConnectionsUserMessage,
  buildMatcherUserMessage,
} from "@/lib/matcher-prompt";
import { APL_SYSTEM_PROMPT, buildAplUserMessage } from "@/lib/apl-prompt";
import {
  classifyRole,
  computeMatchScore,
  deriveVerifiability,
} from "@/lib/scoring";
import {
  aggregateOrgTimeliness,
  deriveAplVerifiability,
  soonestUpcomingDeadline,
} from "@/lib/timeliness";
import type {
  Advisor,
  Apl,
  AplKeyDate,
  Match,
  MatchResponse,
  OrgTimeliness,
  Person,
  Target,
} from "@/lib/types";

// Slightly wider than the 3-month brief so near-boundary triggers aren't lost; recency
// scoring naturally fades older APLs, so a wider window adds context without inflating urgency.
const APL_LOOKBACK_MONTHS = 4;

export const runtime = "nodejs";
// APL discovery runs up to 10 web searches; the 90s default times out in prod.
export const maxDuration = 300;

type PerTargetPeople = {
  targetOrganization: string;
  people: Person[];
  notes?: string;
};

type PerTargetApls = {
  targetOrganization: string;
  apls: Apl[];
  notes?: string;
};

type ConnectionPair = {
  advisorName: string;
  personName: string;
  connectionStrength: number;
  rationale: string;
};

const client = new Anthropic();

async function findPeopleForTarget(target: Target): Promise<PerTargetPeople> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: MATCHER_SYSTEM_PROMPT,
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 5 },
    ],
    messages: [
      { role: "user", content: buildMatcherUserMessage(target.organization) },
    ],
  });

  const textBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = extractJson(textBlock);
  if (!parsed) {
    return {
      targetOrganization: target.organization,
      people: [],
      notes: "Model did not return parseable JSON.",
    };
  }

  const people: Person[] = Array.isArray(parsed.people)
    ? parsed.people
        .filter(
          (p: unknown): p is Person =>
            typeof p === "object" &&
            p !== null &&
            typeof (p as Person).name === "string" &&
            typeof (p as Person).role === "string" &&
            Array.isArray((p as Person).sourceUrls) &&
            (p as Person).sourceUrls.length >= 1,
        )
        .map((p: Person) => ({
          name: p.name,
          role: p.role,
          linkedinUrl: p.linkedinUrl ?? null,
          sourceUrls: p.sourceUrls,
          pastEmployers: Array.isArray(p.pastEmployers) ? p.pastEmployers : [],
          suggestedAdvisorArchetype:
            typeof p.suggestedAdvisorArchetype === "string" &&
            p.suggestedAdvisorArchetype.trim().length > 0
              ? p.suggestedAdvisorArchetype.trim()
              : null,
        }))
    : [];

  return {
    targetOrganization: target.organization,
    people,
    notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
  };
}

async function findApplicableAplsForTarget(
  target: Target,
  today: Date,
): Promise<PerTargetApls> {
  const todayIso = today.toISOString().slice(0, 10);
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: APL_SYSTEM_PROMPT,
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 6 },
      // Plain web_fetch (NOT _20260209, whose code-exec sandbox corrupts PDFs into
      // base64): reads the actual APL PDF so deadlines come from the document, not
      // snippets. Anthropic's fetcher also clears the DHCS bot-wall a raw fetch can't.
      { type: "web_fetch_20250910", name: "web_fetch", max_uses: 5 },
    ],
    messages: [
      {
        role: "user",
        content: buildAplUserMessage({
          organization: target.organization,
          todayIso,
          lookbackMonths: APL_LOOKBACK_MONTHS,
        }),
      },
    ],
  });

  const textBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[apl:${target.organization}] stop_reason=${response.stop_reason} text_len=${textBlock.length}`,
    );
  }

  const parsed = extractJson(textBlock);
  if (!parsed) {
    console.warn(
      `[apl:${target.organization}] failed to parse APL JSON (stop_reason=${response.stop_reason})`,
    );
    return {
      targetOrganization: target.organization,
      apls: [],
      notes: "Model did not return parseable JSON for APLs.",
    };
  }

  const apls: Apl[] = Array.isArray(parsed.apls)
    ? parsed.apls
        .filter(
          (a: unknown): a is Apl =>
            typeof a === "object" &&
            a !== null &&
            typeof (a as Apl).number === "string" &&
            typeof (a as Apl).title === "string" &&
            typeof (a as Apl).sourceUrl === "string" &&
            (a as Apl).sourceUrl.trim().length > 0,
        )
        .map((a: Apl) => {
          const keyDates: AplKeyDate[] = Array.isArray(a.keyDates)
            ? a.keyDates
                .filter(
                  (d: unknown): d is AplKeyDate =>
                    typeof d === "object" &&
                    d !== null &&
                    typeof (d as AplKeyDate).date === "string" &&
                    (d as AplKeyDate).date.trim().length > 0 &&
                    typeof (d as AplKeyDate).label === "string",
                )
                .map((d: AplKeyDate) => ({ date: d.date.trim(), label: d.label }))
            : [];
          return {
            number: a.number,
            title: a.title,
            issuedDate: typeof a.issuedDate === "string" ? a.issuedDate : "",
            keyDates,
            // Derived, not model-provided: the soonest obligation still ahead of us.
            complianceDeadline: soonestUpcomingDeadline(keyDates, today).date,
            summary: typeof a.summary === "string" ? a.summary : "",
            whoAffected: typeof a.whoAffected === "string" ? a.whoAffected : "",
            appliesRationale:
              typeof a.appliesRationale === "string" ? a.appliesRationale : "",
            sourceUrl: a.sourceUrl,
            verifiability: deriveAplVerifiability(a.sourceUrl),
          };
        })
    : [];

  return {
    targetOrganization: target.organization,
    apls,
    notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
  };
}

async function scoreConnections(params: {
  targetOrganization: string;
  advisors: Advisor[];
  people: Person[];
}): Promise<ConnectionPair[]> {
  if (params.people.length === 0 || params.advisors.length === 0) return [];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: CONNECTIONS_SYSTEM_PROMPT,
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 8 },
    ],
    messages: [
      {
        role: "user",
        content: buildConnectionsUserMessage({
          targetOrganization: params.targetOrganization,
          advisors: params.advisors.map((a) => ({
            name: a.name,
            organization: a.organization,
          })),
          people: params.people.map((p) => ({ name: p.name, role: p.role })),
        }),
      },
    ],
  });

  const textBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[connections:${params.targetOrganization}] advisors=${params.advisors
        .map((a) => a.name)
        .join("|")} people=${params.people.map((p) => p.name).join("|")}`,
    );
    console.log(
      `[connections:${params.targetOrganization}] raw response:\n${textBlock}`,
    );
  }

  const parsed = extractJson(textBlock);
  if (!parsed || !Array.isArray(parsed.pairs)) {
    console.warn(
      `[connections:${params.targetOrganization}] failed to parse pairs`,
    );
    return [];
  }

  return parsed.pairs
    .filter(
      (p: unknown): p is ConnectionPair =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as ConnectionPair).advisorName === "string" &&
        typeof (p as ConnectionPair).personName === "string" &&
        typeof (p as ConnectionPair).connectionStrength === "number" &&
        typeof (p as ConnectionPair).rationale === "string",
    )
    .map((p: ConnectionPair) => ({
      advisorName: p.advisorName,
      personName: p.personName,
      connectionStrength: Math.max(0, Math.min(100, Math.round(p.connectionStrength))),
      rationale: p.rationale,
    }));
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findPair(
  pairs: ConnectionPair[],
  advisorName: string,
  personName: string,
): ConnectionPair | undefined {
  const a = normalizeName(advisorName);
  const p = normalizeName(personName);
  return pairs.find(
    (pair) =>
      normalizeName(pair.advisorName) === a &&
      normalizeName(pair.personName) === p,
  );
}

function linkedInSearchUrl(name: string, organization: string): string {
  const keywords = encodeURIComponent(`${name} ${organization}`);
  return `https://www.linkedin.com/search/results/people/?keywords=${keywords}`;
}

function tryParseObject(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s.trim());
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// Yield every top-level {...} block, tracking string literals so braces inside
// strings don't throw off the depth count.
function* balancedObjects(text: string): Generator<string> {
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        yield text.slice(start, i + 1);
        start = -1;
      }
    }
  }
}

// Robust against prose before/after the JSON and inconsistent code fences:
// try the fenced block first, then fall back to the largest parseable object.
function extractJson(text: string): Record<string, unknown> | null {
  const fencedJson = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJson) {
    const parsed = tryParseObject(fencedJson[1]);
    if (parsed) return parsed;
  }
  const fenced = text.match(/```\s*([\s\S]*?)```/);
  if (fenced) {
    const parsed = tryParseObject(fenced[1]);
    if (parsed) return parsed;
  }
  let best: Record<string, unknown> | null = null;
  let bestLen = 0;
  for (const candidate of balancedObjects(text)) {
    const parsed = tryParseObject(candidate);
    if (parsed && candidate.length > bestLen) {
      best = parsed;
      bestLen = candidate.length;
    }
  }
  return best;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  let body: { advisors?: Advisor[]; targets?: Target[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const advisors = body.advisors ?? [];
  const targets = body.targets ?? [];

  if (advisors.length === 0 || targets.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one advisor and one target" },
      { status: 400 },
    );
  }

  const today = new Date();

  const perTarget = await Promise.all(
    targets.map(async (target) => {
      // APL discovery and people-finding are independent — run them concurrently.
      const [peopleResult, aplResult] = await Promise.all([
        findPeopleForTarget(target),
        findApplicableAplsForTarget(target, today),
      ]);
      const pairs =
        peopleResult.people.length > 0
          ? await scoreConnections({
              targetOrganization: target.organization,
              advisors,
              people: peopleResult.people,
            })
          : [];
      return { ...peopleResult, pairs, apls: aplResult.apls, aplNotes: aplResult.notes };
    }),
  );

  const organizations: OrgTimeliness[] = perTarget.map((result) => ({
    organization: result.targetOrganization,
    apls: result.apls,
    timeliness: aggregateOrgTimeliness(result.apls, today),
    notes: result.aplNotes,
  }));

  const matches: Match[] = [];
  const notesParts: string[] = [];
  for (const result of perTarget) {
    if (result.people.length === 0 && result.notes) {
      notesParts.push(`${result.targetOrganization}: ${result.notes}`);
    }
    for (const advisor of advisors) {
      for (const person of result.people) {
        const pair = findPair(result.pairs, advisor.name, person.name);
        if (!pair && result.people.length > 0 && process.env.NODE_ENV !== "production") {
          console.warn(
            `[match] no pair returned for advisor="${advisor.name}" person="${person.name}" at target="${result.targetOrganization}" — falling back to floor`,
          );
        }
        const connectionStrength = pair?.connectionStrength ?? 10;
        const connectionRationale =
          pair?.rationale ??
          "No connection signals surfaced from public web search.";
        const verified = Boolean(person.linkedinUrl);
        const { level: verifiability, multiplier: verifiabilityMultiplier } =
          deriveVerifiability(person.sourceUrls.length, verified);
        const { icpFit } = classifyRole(person.role);
        const matchScore = computeMatchScore({
          icpFit,
          connectionStrength,
          verifiabilityMultiplier,
        });

        matches.push({
          advisorName: advisor.name,
          advisorOrganization: advisor.organization,
          targetOrganization: result.targetOrganization,
          targetName: person.name,
          targetRole: person.role,
          targetLinkedIn:
            person.linkedinUrl ??
            linkedInSearchUrl(person.name, result.targetOrganization),
          targetLinkedInVerified: verified,
          sourceUrls: person.sourceUrls,
          icpFit,
          connectionStrength,
          connectionRationale,
          verifiability,
          matchScore,
          suggestedAdvisorArchetype: person.suggestedAdvisorArchetype,
        });
      }
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);

  const payload: MatchResponse = {
    matches,
    organizations,
    notes: notesParts.length ? notesParts.join(" | ") : undefined,
  };

  return NextResponse.json(payload);
}
