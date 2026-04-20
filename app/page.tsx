"use client";

import Papa from "papaparse";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { downloadCsv, matchesToCsv } from "@/lib/csv";
import { advisorsToText, parseAdvisors, parseTargets, targetsToText } from "@/lib/parse";
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
        <h1 className="text-3xl font-semibold tracking-tight">{copy.appTitle}</h1>
        <p className="max-w-2xl text-sm text-zinc-600">{copy.appSubtitle}</p>
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
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? copy.submitting : copy.submit}
        </button>
        {matches && matches.length > 0 && (
          <button
            type="button"
            onClick={() =>
              downloadCsv("warm-intros.csv", matchesToCsv(matches))
            }
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            {copy.exportCsv}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {notes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
          <label className="text-sm font-medium text-zinc-900">{label}</label>
          <span className="text-xs text-zinc-500">{hint}</span>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
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
        className="min-h-[180px] w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
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

function scoreTone(score: number): string {
  if (score >= 70) return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200";
  if (score >= 40) return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
}

function verifiabilityTone(level: Verifiability): string {
  if (level === "verified") return "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200";
  if (level === "likely") return "bg-sky-50 text-sky-900 ring-1 ring-sky-200";
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
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
  return (
    <div className="flex items-center gap-2">
      <div className="group relative">
        <span
          tabIndex={hasSources ? 0 : -1}
          className={`inline-flex cursor-default rounded-full px-2 py-0.5 text-xs font-medium ${verifiabilityTone(row.verifiability)}`}
          title={copy.verifiabilityHint[row.verifiability]}
        >
          {copy.verifiability[row.verifiability]}
        </span>
        {hasSources && (
          <div className="invisible absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Sources ({row.sourceUrls.length})
            </p>
            <ul className="flex flex-col gap-1">
              {row.sourceUrls.map((u) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                    title={u}
                  >
                    {domainOf(u)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <a
        href={row.targetLinkedIn}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex size-5 items-center justify-center rounded transition-colors ${
          row.targetLinkedInVerified
            ? "text-[#0A66C2] hover:text-[#004182]"
            : "text-zinc-300 hover:text-zinc-500"
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
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tight">
              {copy.draftModal.title}
            </h2>
            <p className="text-xs text-zinc-500">
              {copy.draftModal.subtitleTemplate(
                ctx.path.advisorName,
                ctx.row.targetName,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-900"
            aria-label="Close"
          >
            {copy.draftModal.close}
          </button>
        </header>

        {ctx.advisors.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="sender-select" className="text-zinc-500">
              Send from:
            </label>
            <select
              id="sender-select"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              disabled={loading}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none disabled:opacity-50"
            >
              {ctx.advisors.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-zinc-400">
              · signoff: {firstNameOf(senderName)}
            </span>
          </div>
        )}

        {loading && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            {copy.draftModal.loading}
          </div>
        )}

        {draftError && (
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{draftError}</span>
            <button
              type="button"
              onClick={run}
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
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
                className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
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
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {heading}
        </h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          {copied ? copy.draftModal.copied : copy.draftModal.copy}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 font-sans text-sm leading-relaxed text-zinc-900">
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
      <div className="rounded-md border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        {copy.submitting}
      </div>
    );
  }
  if (matches === null) {
    return (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-500">
        {copy.emptyState}
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-4 py-8 text-center">
        <p className="text-sm font-medium text-zinc-900">
          {copy.emptyResultsTitle}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{copy.emptyResultsBody}</p>
      </div>
    );
  }
  const rows = groupByPerson(matches);
  return (
    <div className="rounded-md border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">{copy.columns.score}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetOrg}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetName}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.verifiability}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.reasoning}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.reachableVia}</th>
            <th className="px-4 py-3 font-medium text-right">{copy.columns.action}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, i) => (
            <tr key={i} className="align-top hover:bg-zinc-50">
              <td className="px-4 py-3">
                {(() => {
                  const shown = displayScore(r.bestScore);
                  return (
                    <span
                      className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-1 font-mono text-sm font-semibold ${scoreTone(shown)}`}
                      title={`ICP fit × connection strength × evidence weight (raw ${r.bestScore})`}
                    >
                      {shown}
                    </span>
                  );
                })()}
              </td>
              <td className="px-4 py-3 text-zinc-700">{r.targetOrganization}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <a
                    href={r.targetLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    title={
                      r.targetLinkedInVerified
                        ? "Verified LinkedIn profile"
                        : "LinkedIn people search (profile not verified)"
                    }
                  >
                    {r.targetName}
                  </a>
                  <span className="text-xs text-zinc-500">{r.targetRole}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <VerifiabilityCell row={r} />
              </td>
              <td className="px-4 py-3 text-xs leading-relaxed text-zinc-600">
                <p>{r.bestRationale}</p>
                {displayScore(r.bestScore) < 40 && (
                  <p className="mt-2 italic text-amber-800">
                    <span className="font-medium not-italic">
                      {copy.networkGapPrefix}
                    </span>{" "}
                    {copy.networkGapPhrase(
                      r.suggestedAdvisorArchetype ??
                        copy.networkGapFallbackArchetype,
                    )}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                <ul className="flex flex-col gap-0.5 text-xs text-zinc-700">
                  {r.paths.map((p) => (
                    <li key={p.advisorName} className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-zinc-400">
                        {p.connectionStrength}
                      </span>
                      <span>{p.advisorName}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDraft(r)}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
                >
                  {copy.draftIntro}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
