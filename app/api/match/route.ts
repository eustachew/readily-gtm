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
} from "@/lib/timeliness";
import type {
  Advisor,
  Apl,
  Match,
  MatchResponse,
  OrgTimeliness,
  Person,
  Target,
} from "@/lib/types";

const APL_LOOKBACK_MONTHS = 3;

export const runtime = "nodejs";
export const maxDuration = 90;

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
  todayIso: string,
): Promise<PerTargetApls> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3072,
    system: APL_SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
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

  const parsed = extractJson(textBlock);
  if (!parsed) {
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
        .map((a: Apl) => ({
          number: a.number,
          title: a.title,
          issuedDate: typeof a.issuedDate === "string" ? a.issuedDate : "",
          complianceDeadline:
            typeof a.complianceDeadline === "string" &&
            a.complianceDeadline.trim().length > 0
              ? a.complianceDeadline
              : null,
          summary: typeof a.summary === "string" ? a.summary : "",
          whoAffected: typeof a.whoAffected === "string" ? a.whoAffected : "",
          appliesRationale:
            typeof a.appliesRationale === "string" ? a.appliesRationale : "",
          sourceUrl: a.sourceUrl,
          verifiability: deriveAplVerifiability(a.sourceUrl),
        }))
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

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    const loose = candidate.match(/\{[\s\S]*\}/);
    if (!loose) return null;
    try {
      return JSON.parse(loose[0]);
    } catch {
      return null;
    }
  }
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
  const todayIso = today.toISOString().slice(0, 10);

  const perTarget = await Promise.all(
    targets.map(async (target) => {
      // APL discovery and people-finding are independent — run them concurrently.
      const [peopleResult, aplResult] = await Promise.all([
        findPeopleForTarget(target),
        findApplicableAplsForTarget(target, todayIso),
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
