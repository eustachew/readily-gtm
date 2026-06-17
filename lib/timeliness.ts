import type {
  Apl,
  AplKeyDate,
  TimelinessLabel,
  TimelinessScore,
  Verifiability,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Applicable APLs never read fully cold — a relevant rule on the books is still worth a mention. */
const BASELINE_SCORE = 20;

function isoToUtcDay(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayUtcDay(today: Date): number {
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

/** Whole days from `today` until `iso` (negative = already past); null if missing/unparseable. */
export function daysUntil(iso: string | null, today: Date): number | null {
  if (!iso) return null;
  const end = isoToUtcDay(iso);
  if (end === null) return null;
  return Math.round((end - todayUtcDay(today)) / MS_PER_DAY);
}

/** Whole days since `iso` was issued (negative = future); null if missing/unparseable. */
export function daysSince(iso: string | null, today: Date): number | null {
  const until = daysUntil(iso, today);
  return until === null ? null : -until;
}

/** The nearest still-upcoming dated obligation — what a countdown should point at. */
export function soonestUpcomingDeadline(
  keyDates: AplKeyDate[],
  today: Date,
): { date: string | null; days: number | null } {
  let best: { date: string; days: number } | null = null;
  for (const kd of keyDates) {
    const days = daysUntil(kd.date, today);
    if (days === null || days < 0) continue;
    if (!best || days < best.days) best = { date: kd.date, days };
  }
  return best ? { date: best.date, days: best.days } : { date: null, days: null };
}

/** Urgency from how soon a binding deadline lands. No upcoming deadline → 0 (recency may still carry it). */
function deadlineScore(days: number | null): number {
  if (days === null || days < 0) return 0;
  if (days <= 30) return Math.round(100 - (days / 30) * 10); // 100 → 90
  if (days <= 90) return Math.round(89 - ((days - 31) / 59) * 29); // 89 → 60
  if (days <= 180) return Math.round(59 - ((days - 91) / 89) * 24); // 59 → 35
  return 30;
}

/**
 * Urgency from how recently the APL dropped. A just-issued APL is itself the compelling event for
 * a warm intro — "this just landed and affects you" — even when it states no hard deadline.
 */
function recencyScore(daysSinceIssued: number | null): number {
  if (daysSinceIssued === null || daysSinceIssued < 0) return 0;
  if (daysSinceIssued <= 7) return 80; // just dropped
  if (daysSinceIssued <= 30) return 62; // still fresh
  if (daysSinceIssued <= 60) return 42;
  if (daysSinceIssued <= 90) return 28;
  return 20;
}

function labelForScore(score: number): TimelinessLabel {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 35) return "cool";
  return "informational";
}

/**
 * Urgency of a single APL: the stronger of its deadline proximity and its issuance recency.
 * Urgency ≠ connection strength — this answers "should we reach now," not "can we get in."
 */
export function scoreApl(
  apl: Pick<Apl, "keyDates" | "issuedDate">,
  today: Date,
): {
  score: number;
  label: TimelinessLabel;
  soonestDeadline: string | null;
  daysToDeadline: number | null;
} {
  const { date: soonestDeadline, days } = soonestUpcomingDeadline(apl.keyDates ?? [], today);
  const score = Math.max(
    BASELINE_SCORE,
    deadlineScore(days),
    recencyScore(daysSince(apl.issuedDate, today)),
  );
  return { score, label: labelForScore(score), soonestDeadline, daysToDeadline: days };
}

/**
 * Roll a target org's applicable APLs up to one timeliness signal: the most urgent APL wins,
 * and the soonest upcoming deadline across all of them is surfaced for the badge/countdown.
 */
export function aggregateOrgTimeliness(apls: Apl[], today: Date): TimelinessScore {
  if (apls.length === 0) {
    return { score: 0, label: "informational", soonestDeadline: null, daysToDeadline: null };
  }

  let bestScore = -1;
  let soonestDeadline: string | null = null;
  let soonestDays: number | null = null;

  for (const apl of apls) {
    const scored = scoreApl(apl, today);
    if (scored.score > bestScore) bestScore = scored.score;
    if (
      scored.daysToDeadline !== null &&
      scored.daysToDeadline >= 0 &&
      (soonestDays === null || scored.daysToDeadline < soonestDays)
    ) {
      soonestDays = scored.daysToDeadline;
      soonestDeadline = scored.soonestDeadline;
    }
  }

  const score = Math.max(0, bestScore);
  return { score, label: labelForScore(score), soonestDeadline, daysToDeadline: soonestDays };
}

const DHCS_HOSTS = ["dhcs.ca.gov"];

/**
 * Trust tier for an APL's citation. A primary DHCS source is verified; any other live
 * citation is "likely"; the matcher abstains rather than return an APL with no source,
 * so "inferred" is the conservative floor.
 */
export function deriveAplVerifiability(sourceUrl: string): Verifiability {
  let host: string;
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "inferred";
  }
  if (DHCS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return "verified";
  }
  return host ? "likely" : "inferred";
}
