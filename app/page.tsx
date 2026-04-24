"use client";

import Papa from "papaparse";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { copy } from "@/lib/copy";
import { downloadCsv, matchesToCsv } from "@/lib/csv";
import { advisorsToText, parseAdvisors, parseTargets, targetsToText } from "@/lib/parse";
import { classifyRole, type PersonaRank } from "@/lib/scoring";
import type {
  Advisor,
  DraftResponse,
  Match,
  MatchResponse,
  Verifiability,
} from "@/lib/types";

type DraftContext = {
  row: PersonRow;
  path: Path;
  advisors: Advisor[];
};

export default function Home() {
  const [advisorsText, setAdvisorsText] = useState("");
  const [targetsText, setTargetsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [draftCtx, setDraftCtx] = useState<DraftContext | null>(null);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    setMatches(null);
    setNotes(undefined);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          advisors: parseAdvisors(advisorsText),
          targets: parseTargets(targetsText),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: copy.error }));
        throw new Error(err.error ?? copy.error);
      }
      const data = (await res.json()) as MatchResponse;
      setMatches(data.matches);
      setNotes(data.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.error);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = advisorsText.trim() && targetsText.trim() && !loading;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold leading-none tracking-tight text-foreground">
          {copy.appTitle}
        </h1>
        <p className="max-w-2xl text-sm text-muted">{copy.appSubtitle}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <InputCard
          label={copy.advisorsLabel}
          hint={copy.advisorsHint}
          placeholder={copy.advisorsPlaceholder}
          value={advisorsText}
          onChange={setAdvisorsText}
          onCsv={(rows) => setAdvisorsText(advisorsToText(rows))}
        />
        <InputCard
          label={copy.targetsLabel}
          hint={copy.targetsHint}
          placeholder={copy.targetsPlaceholder}
          value={targetsText}
          onChange={setTargetsText}
          onCsv={(rows) => setTargetsText(targetsToText(rows))}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? copy.submitting : copy.submit}
        </button>
        {matches && matches.length > 0 && (
          <button
            type="button"
            onClick={() =>
              downloadCsv("warm-intros.csv", matchesToCsv(matches))
            }
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-transparent px-4 text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
          >
            {copy.exportCsv}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-accent-ring bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {error}
        </div>
      )}

      {notes && (
        <div className="rounded-md border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
          {notes}
        </div>
      )}

      <ResultsTable
        matches={matches}
        loading={loading}
        onDraft={(row) =>
          setDraftCtx({
            row,
            path: row.paths[0],
            advisors: parseAdvisors(advisorsText),
          })
        }
      />

      {draftCtx && (
        <DraftModal
          ctx={draftCtx}
          onClose={() => setDraftCtx(null)}
        />
      )}
    </main>
  );
}

function InputCard({
  label,
  hint,
  placeholder,
  value,
  onChange,
  onCsv,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onCsv: (rows: string[][]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.filter((r) => r.some((c) => c?.trim()));
        if (rows.length > 0 && rows[0].some((c) => /name|organization|org/i.test(c))) {
          rows.shift();
        }
        onCsv(rows);
      },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-foreground">{label}</label>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground"
        >
          {copy.uploadCsv}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="min-h-[180px] w-full resize-y rounded-md border border-border-strong bg-surface px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
      />
    </div>
  );
}

type Path = {
  advisorName: string;
  advisorOrganization: string;
  connectionStrength: number;
  matchScore: number;
  rationale: string;
};

type PersonRow = {
  targetOrganization: string;
  targetName: string;
  targetRole: string;
  targetLinkedIn: string;
  targetLinkedInVerified: boolean;
  sourceUrls: string[];
  verifiability: Verifiability;
  bestScore: number;
  bestRationale: string;
  paths: Path[];
  suggestedAdvisorArchetype: string | null;
};

function groupByPerson(matches: Match[]): PersonRow[] {
  const byKey = new Map<string, PersonRow>();
  for (const m of matches) {
    const key = `${m.targetOrganization}|${m.targetName}`;
    const path: Path = {
      advisorName: m.advisorName,
      advisorOrganization: m.advisorOrganization,
      connectionStrength: m.connectionStrength,
      matchScore: m.matchScore,
      rationale: m.connectionRationale,
    };
    const existing = byKey.get(key);
    if (existing) {
      existing.paths.push(path);
    } else {
      byKey.set(key, {
        targetOrganization: m.targetOrganization,
        targetName: m.targetName,
        targetRole: m.targetRole,
        targetLinkedIn: m.targetLinkedIn,
        targetLinkedInVerified: m.targetLinkedInVerified,
        sourceUrls: m.sourceUrls ?? [],
        verifiability: m.verifiability,
        bestScore: m.matchScore,
        bestRationale: m.connectionRationale,
        paths: [path],
        suggestedAdvisorArchetype: m.suggestedAdvisorArchetype,
      });
    }
  }
  const rows = Array.from(byKey.values());
  for (const row of rows) {
    row.paths.sort((a, b) => b.matchScore - a.matchScore);
    const best = row.paths[0];
    row.bestScore = best.matchScore;
    row.bestRationale = best.rationale;
  }
  rows.sort((a, b) => b.bestScore - a.bestScore);
  return rows;
}

function displayScore(raw: number): number {
  return Math.min(99, Math.round(raw * 1.8));
}

function verifiabilityTone(level: Verifiability): string {
  if (level === "verified") return "bg-verified-soft text-verified-ink ring-1 ring-verified-ring";
  if (level === "likely") return "bg-likely-soft text-likely-ink ring-1 ring-likely-ring";
  return "bg-inferred-soft text-inferred-ink ring-1 ring-inferred-ring";
}

type Priority = "high" | "medium" | "low" | "network-gap";

function priorityFor(row: PersonRow): Priority {
  const hasViablePath = row.paths.some((p) => p.connectionStrength > 15);
  if (!hasViablePath) return "network-gap";
  if (row.bestScore >= 50) {
    return row.verifiability === "inferred" ? "medium" : "high";
  }
  if (row.bestScore >= 25) return "medium";
  return "low";
}

function priorityLabel(p: Priority): string {
  if (p === "high") return copy.priority.high;
  if (p === "medium") return copy.priority.medium;
  if (p === "low") return copy.priority.low;
  return copy.priority.networkGap;
}

function priorityTone(p: Priority): string {
  if (p === "high") return "bg-verified-soft text-verified-ink ring-1 ring-verified-ring";
  if (p === "medium") return "bg-surface-muted text-foreground ring-1 ring-border-strong";
  if (p === "low") return "bg-surface-muted text-muted ring-1 ring-border";
  return "bg-accent-soft text-accent-ink ring-1 ring-accent-ring";
}

function icpTier(icpFit: number): "Primary" | "Secondary" | "Weak" {
  if (icpFit >= 1.0) return "Primary";
  if (icpFit >= 0.6) return "Secondary";
  return "Weak";
}

function icpTierLabel(tier: "Primary" | "Secondary" | "Weak"): string {
  if (tier === "Primary") return copy.scorePopover.icpTierPrimary;
  if (tier === "Secondary") return copy.scorePopover.icpTierSecondary;
  return copy.scorePopover.icpTierWeak;
}

function icpDescription(rank: PersonaRank): string {
  const d = copy.scorePopover.icpDescriptions;
  if (rank === 1) return d.rank1;
  if (rank === 2) return d.rank2;
  if (rank === 3) return d.rank3;
  if (rank === 4) return d.rank4;
  if (rank === 5) return d.rank5;
  return d.none;
}

const POPOVER_COLLISION_PADDING = 16;

function HoverPopover({
  trigger,
  children,
  widthClass = "w-64",
  widthPx = 256,
}: {
  trigger: ReactNode;
  children: ReactNode;
  widthClass?: string;
  widthPx?: number;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const check = () => {
      const rect = el.getBoundingClientRect();
      const overflowsRight =
        rect.left + widthPx + POPOVER_COLLISION_PADDING > window.innerWidth;
      setAlignRight(overflowsRight);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [widthPx]);

  return (
    <div ref={anchorRef} className="group relative inline-block">
      {trigger}
      <div
        role="tooltip"
        className={`invisible absolute top-full z-20 mt-1 ${widthClass} ${alignRight ? "right-0" : "left-0"} rounded-md border border-border-strong bg-surface p-3 text-left opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100`}
      >
        {children}
      </div>
    </div>
  );
}

function ScoreBreakdown({ row, path }: { row: PersonRow; path: Path }) {
  const { rank, icpFit } = classifyRole(row.targetRole);
  const tier = icpTier(icpFit);
  return (
    <dl className="flex flex-col gap-2 text-xs leading-relaxed">
      <div>
        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {copy.scorePopover.icpLabel}
        </dt>
        <dd className="text-foreground">
          <span className="font-medium">{icpTierLabel(tier)}</span>
          <span className="text-muted"> — {row.targetRole}, {icpDescription(rank)}</span>
        </dd>
      </div>
      <div>
        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {copy.scorePopover.connectionLabel}
        </dt>
        <dd className="text-foreground">
          <span className="font-mono font-medium">{path.connectionStrength} / 100</span>
          <span className="text-muted"> — {path.rationale}</span>
        </dd>
      </div>
      <div>
        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {copy.scorePopover.verifiabilityLabel}
        </dt>
        <dd className="text-foreground">
          <span className="font-medium">{copy.verifiability[row.verifiability]}</span>
          <span className="text-muted"> — {copy.scorePopover.verifiabilityDescriptions[row.verifiability]}</span>
        </dd>
      </div>
    </dl>
  );
}

function ScorePill({ row, path }: { row: PersonRow; path: Path }) {
  const shown = displayScore(path.matchScore);
  return (
    <HoverPopover
      widthClass="w-80"
      widthPx={320}
      trigger={
        <span
          tabIndex={0}
          className="inline-flex min-w-[2rem] cursor-help justify-center rounded-md bg-surface-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground ring-1 ring-border focus:outline-none focus:ring-border-strong"
        >
          {shown}
        </span>
      }
    >
      <ScoreBreakdown row={row} path={path} />
    </HoverPopover>
  );
}

function PriorityCell({ row }: { row: PersonRow }) {
  const p = priorityFor(row);
  const best = row.paths[0];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityTone(p)}`}
        >
          {priorityLabel(p)}
        </span>
        {p !== "network-gap" && <ScorePill row={row} path={best} />}
      </div>
      {p === "network-gap" && (
        <p className="text-xs text-accent-ink">
          {copy.networkGapPhrase(
            row.suggestedAdvisorArchetype ??
              copy.networkGapFallbackArchetype,
          )}
        </p>
      )}
    </div>
  );
}

function PriorityCounts({ rows }: { rows: PersonRow[] }) {
  const counts = { high: 0, medium: 0, low: 0, "network-gap": 0 };
  for (const r of rows) counts[priorityFor(r)] += 1;
  const gapCount = counts["network-gap"];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>
        <strong className="font-mono font-semibold text-verified-ink">{counts.high}</strong>{" "}
        {copy.priorityCounts.high}
      </span>
      <span className="text-border-strong">·</span>
      <span>
        <strong className="font-mono font-semibold text-foreground">{counts.medium}</strong>{" "}
        {copy.priorityCounts.medium}
      </span>
      <span className="text-border-strong">·</span>
      <span>
        <strong className="font-mono font-semibold text-muted">{counts.low}</strong>{" "}
        {copy.priorityCounts.low}
      </span>
      <span className="text-border-strong">·</span>
      <span>
        <strong className="font-mono font-semibold text-accent-ink">{gapCount}</strong>{" "}
        {gapCount === 1
          ? copy.priorityCounts.networkGapSingular
          : copy.priorityCounts.networkGapPlural}
      </span>
    </div>
  );
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function VerifiabilityCell({ row }: { row: PersonRow }) {
  const hasSources = row.sourceUrls.length > 0;
  const badge = (
    <span
      tabIndex={hasSources ? 0 : -1}
      className={`inline-flex cursor-default rounded-full px-2 py-0.5 text-xs font-medium ${verifiabilityTone(row.verifiability)}`}
      title={copy.verifiabilityHint[row.verifiability]}
    >
      {copy.verifiability[row.verifiability]}
    </span>
  );
  return (
    <div className="flex items-center gap-2">
      {hasSources ? (
        <HoverPopover trigger={badge}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sources ({row.sourceUrls.length})
          </p>
          <ul className="flex flex-col gap-1">
            {row.sourceUrls.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-foreground underline-offset-2 hover:text-accent hover:underline"
                  title={u}
                >
                  {domainOf(u)}
                </a>
              </li>
            ))}
          </ul>
        </HoverPopover>
      ) : (
        badge
      )}
      <a
        href={row.targetLinkedIn}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex size-5 items-center justify-center rounded transition-colors ${
          row.targetLinkedInVerified
            ? "text-[#0A66C2] hover:text-[#004182]"
            : "text-border-strong hover:text-muted-foreground"
        }`}
        title={
          row.targetLinkedInVerified
            ? "Open LinkedIn profile"
            : "LinkedIn search (profile not verified)"
        }
        aria-label={
          row.targetLinkedInVerified
            ? "Open LinkedIn profile"
            : "LinkedIn search"
        }
      >
        <LinkedInGlyph className="size-4" />
      </a>
    </div>
  );
}

function firstNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName.trim();
}

function DraftModal({
  ctx,
  onClose,
}: {
  ctx: DraftContext;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string>(
    ctx.advisors[0]?.name ?? ctx.path.advisorName,
  );

  const run = useCallback(async () => {
    setLoading(true);
    setDraftError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          advisorName: ctx.path.advisorName,
          advisorOrganization: ctx.path.advisorOrganization,
          targetName: ctx.row.targetName,
          targetRole: ctx.row.targetRole,
          targetOrganization: ctx.row.targetOrganization,
          connectionRationale: ctx.path.rationale,
          senderFirstName: firstNameOf(senderName),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: copy.draftModal.error }));
        throw new Error(err.error ?? copy.draftModal.error);
      }
      setDraft((await res.json()) as DraftResponse);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : copy.draftModal.error);
    } finally {
      setLoading(false);
    }
  }, [ctx, senderName]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-lg border border-border-strong bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {copy.draftModal.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {copy.draftModal.subtitleTemplate(
                ctx.path.advisorName,
                ctx.row.targetName,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground"
            aria-label="Close"
          >
            {copy.draftModal.close}
          </button>
        </header>

        {ctx.advisors.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="sender-select" className="text-muted-foreground">
              Send from:
            </label>
            <select
              id="sender-select"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              disabled={loading}
              className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-foreground focus:border-foreground focus:outline-none disabled:opacity-50"
            >
              {ctx.advisors.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">
              · signoff: {firstNameOf(senderName)}
            </span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-border bg-surface-muted px-4 py-8 text-center text-sm text-muted-foreground">
            {copy.draftModal.loading}
          </div>
        )}

        {draftError && (
          <div className="flex items-center justify-between rounded-md border border-accent-ring bg-accent-soft px-4 py-3 text-sm text-accent-ink">
            <span>{draftError}</span>
            <button
              type="button"
              onClick={run}
              className="rounded-md border border-accent-ring bg-surface px-3 py-1 text-xs font-medium text-accent-ink hover:bg-surface-muted"
            >
              {copy.draftModal.retry}
            </button>
          </div>
        )}

        {draft && (
          <>
            <DraftBlock
              heading={copy.draftModal.emailHeading}
              body={draft.email}
            />
            <DraftBlock
              heading={copy.draftModal.blurbHeading}
              body={draft.forwardableBlurb}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={run}
                className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                {copy.draftModal.retry}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DraftBlock({ heading, body }: { heading: string; body: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard denied — fall through silently
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          {copied ? copy.draftModal.copied : copy.draftModal.copy}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted px-4 py-3 font-sans text-sm leading-relaxed text-foreground">
        {body}
      </pre>
    </section>
  );
}

function ResultsTable({
  matches,
  loading,
  onDraft,
}: {
  matches: Match[] | null;
  loading: boolean;
  onDraft: (row: PersonRow) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        {copy.submitting}
      </div>
    );
  }
  if (matches === null) {
    return (
      <div className="rounded-md border border-dashed border-border-strong bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        {copy.emptyState}
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">
          {copy.emptyResultsTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{copy.emptyResultsBody}</p>
      </div>
    );
  }
  const rows = groupByPerson(matches);
  return (
    <div className="flex flex-col gap-3">
      <PriorityCounts rows={rows} />
      <div className="rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-strong bg-surface-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{copy.columns.priority}</th>
              <th className="px-4 py-3 font-medium">{copy.columns.targetOrg}</th>
              <th className="px-4 py-3 font-medium">{copy.columns.targetName}</th>
              <th className="px-4 py-3 font-medium">{copy.columns.verifiability}</th>
              <th className="px-4 py-3 font-medium">{copy.columns.reasoning}</th>
              <th className="px-4 py-3 font-medium">{copy.columns.bestPath}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => {
              const isNetworkGap = priorityFor(r) === "network-gap";
              return (
                <tr key={i} className="align-top hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <PriorityCell row={r} />
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.targetOrganization}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <a
                        href={r.targetLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                        title={
                          r.targetLinkedInVerified
                            ? "Verified LinkedIn profile"
                            : "LinkedIn people search (profile not verified)"
                        }
                      >
                        {r.targetName}
                      </a>
                      <span className="text-xs text-muted-foreground">{r.targetRole}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <VerifiabilityCell row={r} />
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-muted">
                    <p>{r.bestRationale}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ol className="flex flex-col gap-0.5 text-xs">
                      {r.paths.map((p, idx) => (
                        <li
                          key={p.advisorName}
                          className={`whitespace-nowrap ${
                            idx === 0
                              ? "font-semibold text-foreground"
                              : "font-normal text-muted"
                          }`}
                        >
                          {idx + 1}. {p.advisorName}
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isNetworkGap && (
                      <button
                        type="button"
                        onClick={() => onDraft(r)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground"
                      >
                        {copy.draftIntro}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
