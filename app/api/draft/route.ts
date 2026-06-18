import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  DRAFT_SYSTEM_PROMPT,
  buildDraftUserMessage,
  type DraftAplBrief,
} from "@/lib/draft-prompt";
import { classifyRole } from "@/lib/scoring";
import { soonestUpcomingDeadline } from "@/lib/timeliness";
import type {
  Apl,
  DraftRequest,
  DraftResponse,
  ReadinessChecklistItem,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

const client = new Anthropic();

function buildAplBrief(apl: Apl | null | undefined): DraftAplBrief | null {
  if (
    !apl ||
    typeof apl.number !== "string" ||
    typeof apl.title !== "string" ||
    !Array.isArray(apl.keyDates)
  ) {
    return null;
  }
  const keyDates = apl.keyDates
    .filter((d) => d && typeof d.date === "string" && typeof d.label === "string")
    .map((d) => ({ date: d.date, label: d.label }));
  const soonest = soonestUpcomingDeadline(keyDates, new Date());
  return {
    number: apl.number,
    title: apl.title,
    issuedDate: typeof apl.issuedDate === "string" ? apl.issuedDate : "",
    summary: typeof apl.summary === "string" ? apl.summary : "",
    whoAffected: typeof apl.whoAffected === "string" ? apl.whoAffected : "",
    soonestDeadline: soonest.date,
    daysToDeadline: soonest.days,
    keyDates,
    sourceUrl: typeof apl.sourceUrl === "string" ? apl.sourceUrl : "",
  };
}

function parseChecklist(value: unknown): ReadinessChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (x: unknown): x is { item: string; due?: unknown } =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as { item?: unknown }).item === "string" &&
        (x as { item: string }).item.trim().length > 0,
    )
    .map((x) => ({
      item: x.item.trim(),
      due:
        typeof x.due === "string" && x.due.trim().length > 0 ? x.due.trim() : null,
    }));
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
    "senderFirstName",
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
  const aplBrief = buildAplBrief(body.apl);

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2000,
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
          senderFirstName: body.senderFirstName,
          apl: aplBrief,
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
    readinessChecklist: parseChecklist(parsed.readinessChecklist),
  };

  return NextResponse.json(payload);
}
