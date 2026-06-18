import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  FIND_ADVISORS_SYSTEM_PROMPT,
  buildFindAdvisorsUserMessage,
} from "@/lib/find-advisors-prompt";
import { deriveVerifiability } from "@/lib/scoring";
import type {
  CandidateAdvisor,
  FindAdvisorsRequest,
  FindAdvisorsResponse,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic();

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
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

  let body: FindAdvisorsRequest;
  try {
    body = (await req.json()) as FindAdvisorsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const org = body.targetOrganization?.trim();
  if (!org) {
    return NextResponse.json(
      { error: "Missing targetOrganization" },
      { status: 400 },
    );
  }

  // One web_search call per click — keeps this on-demand action cheap.
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: FIND_ADVISORS_SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content: buildFindAdvisorsUserMessage(org) }],
  });

  const textBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = extractJson(textBlock);
  if (!parsed) {
    return NextResponse.json(
      {
        targetOrganization: org,
        candidates: [],
        notes: "Model did not return parseable JSON.",
      } satisfies FindAdvisorsResponse,
      { status: 200 },
    );
  }

  const candidates: CandidateAdvisor[] = Array.isArray(parsed.candidates)
    ? parsed.candidates
        .filter(
          (c: unknown): c is CandidateAdvisor =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as CandidateAdvisor).name === "string" &&
            typeof (c as CandidateAdvisor).role === "string" &&
            Array.isArray((c as CandidateAdvisor).sourceUrls) &&
            (c as CandidateAdvisor).sourceUrls.length >= 1,
        )
        .map((c: CandidateAdvisor) => {
          const linkedinUrl =
            typeof c.linkedinUrl === "string" && c.linkedinUrl.trim().length > 0
              ? c.linkedinUrl.trim()
              : null;
          const sourceUrls = c.sourceUrls.filter(
            (u): u is string => typeof u === "string" && u.length > 0,
          );
          const { level } = deriveVerifiability(
            sourceUrls.length,
            Boolean(linkedinUrl),
          );
          return {
            name: c.name,
            role: c.role,
            organization:
              typeof c.organization === "string" ? c.organization : "",
            pathStrength: Math.max(
              0,
              Math.min(100, Math.round(Number(c.pathStrength) || 0)),
            ),
            bridgeRationale:
              typeof c.bridgeRationale === "string" ? c.bridgeRationale : "",
            linkedinUrl,
            sourceUrls,
            verifiability: level,
          };
        })
        .sort((a, b) => b.pathStrength - a.pathStrength)
    : [];

  const payload: FindAdvisorsResponse = {
    targetOrganization: org,
    candidates,
    notes:
      candidates.length === 0 && typeof parsed.notes === "string"
        ? parsed.notes
        : undefined,
  };

  return NextResponse.json(payload);
}
