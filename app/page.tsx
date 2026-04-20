"use client";

import Papa from "papaparse";
import { useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { downloadCsv, matchesToCsv } from "@/lib/csv";
import { advisorsToText, parseAdvisors, parseTargets, targetsToText } from "@/lib/parse";
import type { Match, MatchResponse } from "@/lib/types";

export default function Home() {
  const [advisorsText, setAdvisorsText] = useState("");
  const [targetsText, setTargetsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [notes, setNotes] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

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

      <ResultsTable matches={matches} loading={loading} />
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

function ResultsTable({
  matches,
  loading,
}: {
  matches: Match[] | null;
  loading: boolean;
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
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">{copy.columns.advisor}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetOrg}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetName}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetRole}</th>
            <th className="px-4 py-3 font-medium">{copy.columns.targetLinkedIn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {matches.map((m, i) => (
            <tr key={i} className="hover:bg-zinc-50">
              <td className="px-4 py-3 text-zinc-900">{m.advisorName}</td>
              <td className="px-4 py-3 text-zinc-700">{m.targetOrganization}</td>
              <td className="px-4 py-3 text-zinc-900">{m.targetName}</td>
              <td className="px-4 py-3 text-zinc-700">{m.targetRole}</td>
              <td className="px-4 py-3">
                {m.targetLinkedIn ? (
                  <a
                    href={m.targetLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
