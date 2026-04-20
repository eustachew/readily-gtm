import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { DRAFT_SYSTEM_PROMPT, buildDraftUserMessage } from "@/lib/draft-prompt";
import { classifyRole } from "@/lib/scoring";
import type { DraftRequest, DraftResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

const client = new Anthropic();

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

  let body: DraftRequest;
  try {
    body = (await req.json()) as DraftRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required: Array<keyof DraftRequest> = [
    "advisorName",
    "advisorOrganization",
    "targetName",
    "targetRole",
    "targetOrganization",
    "connectionRationale",
  ];
  for (const key of required) {
    if (typeof body[key] !== "string" || body[key].length === 0) {
      return NextResponse.json(
        { error: `Missing or invalid field: ${key}` },
        { status: 400 },
      );
    }
  }

  const { rank } = classifyRole(body.targetRole);

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1500,
    system: DRAFT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildDraftUserMessage({
          advisorName: body.advisorName,
          advisorOrganization: body.advisorOrganization,
          targetName: body.targetName,
          targetRole: body.targetRole,
          targetOrganization: body.targetOrganization,
          connectionRationale: body.connectionRationale,
          personaRank: rank,
        }),
      },
    ],
  });

  const textBlock = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = extractJson(textBlock);
  if (
    !parsed ||
    typeof parsed.email !== "string" ||
    typeof parsed.forwardableBlurb !== "string"
  ) {
    return NextResponse.json(
      { error: "Model did not return a valid draft." },
      { status: 502 },
    );
  }

  const payload: DraftResponse = {
    email: parsed.email,
    forwardableBlurb: parsed.forwardableBlurb,
  };

  return NextResponse.json(payload);
}
