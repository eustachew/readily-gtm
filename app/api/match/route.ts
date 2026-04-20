import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  MATCHER_SYSTEM_PROMPT,
  buildMatcherUserMessage,
} from "@/lib/matcher-prompt";
import type { Advisor, Match, MatchResponse, Person, Target } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type PerTargetResult = {
  targetOrganization: string;
  people: Person[];
  notes?: string;
};

const client = new Anthropic();

async function findPeopleForTarget(
  target: Target,
): Promise<PerTargetResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: MATCHER_SYSTEM_PROMPT,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
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
        }))
    : [];

  return {
    targetOrganization: target.organization,
    people,
    notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
  };
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

  const perTarget = await Promise.all(targets.map(findPeopleForTarget));

  const matches: Match[] = [];
  const notesParts: string[] = [];
  for (const result of perTarget) {
    if (result.people.length === 0 && result.notes) {
      notesParts.push(`${result.targetOrganization}: ${result.notes}`);
    }
    for (const advisor of advisors) {
      for (const person of result.people) {
        matches.push({
          advisorName: advisor.name,
          advisorOrganization: advisor.organization,
          targetOrganization: result.targetOrganization,
          targetName: person.name,
          targetRole: person.role,
          targetLinkedIn: person.linkedinUrl,
        });
      }
    }
  }

  const payload: MatchResponse = {
    matches,
    notes: notesParts.length ? notesParts.join(" | ") : undefined,
  };

  return NextResponse.json(payload);
}
