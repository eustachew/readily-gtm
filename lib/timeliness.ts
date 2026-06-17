import type { Apl, TimelinessLabel, TimelinessScore, Verifiability } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Whole days from `today` until `iso` (negative = already past).
 * Returns null when the date is missing or unparseable — we never guess a deadline.
 */
export function daysUntil(iso: string | null, today: Date): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const end = Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * Urgency of a single APL, driven by how soon its compliance deadline lands.
 * Urgency ≠ connection strength — this answers "should we reach now," not "can we get in."
 * No deadline (or a past one) is informational, not urgent: the APL still matters, but it
 * isn't a clock-is-ticking trigger for outreach.
 */
export function scoreApl(
  apl: Pick<Apl, "complianceDeadline">,
  today: Date,
): { score: number; label: TimelinessLabel; daysToDeadline: number | null } {
  const days = daysUntil(apl.complianceDeadline, today);

  if (days === null || days < 0) {
    return { score: 25, label: "informational", daysToDeadline: days };
  }
  if (days <= 30) {
    // 0 days → 100, 30 days → 90
    return { score: Math.round(100 - (days / 30) * 10), label: "hot", daysToDeadline: days };
  }
  if (days <= 90) {
    // 31 days → ~89, 90 days → 60
    return { score: Math.round(89 - ((days - 31) / 59) * 29), label: "warm", daysToDeadline: days };
  }
  if (days <= 180) {
    // 91 days → ~59, 180 days → 35
    return { score: Math.round(59 - ((days - 91) / 89) * 24), label: "cool", daysToDeadline: days };
  }
  return { score: 30, label: "cool", daysToDeadline: days };
}

/**
 * Roll a target org's applicable APLs up to one timeliness signal: the most urgent APL wins,
 * and the soonest upcoming deadline is surfaced for the badge/countdown.
 */
export function aggregateOrgTimeliness(apls: Apl[], today: Date): TimelinessScore {
  if (apls.length === 0) {
    return { score: 0, label: "informational", soonestDeadline: null, daysToDeadline: null };
  }

  let best = { score: -1, label: "informational" as TimelinessLabel };
  let soonestDeadline: string | null = null;
  let soonestDays: number | null = null;

  for (const apl of apls) {
    const scored = scoreApl(apl, today);
    if (scored.score > best.score) {
      best = { score: scored.score, label: scored.label };
    }
    // Track the nearest *upcoming* deadline for the countdown.
    if (scored.daysToDeadline !== null && scored.daysToDeadline >= 0) {
      if (soonestDays === null || scored.daysToDeadline < soonestDays) {
        soonestDays = scored.daysToDeadline;
        soonestDeadline = apl.complianceDeadline;
      }
    }
  }

  return {
    score: Math.max(0, best.score),
    label: best.label,
    soonestDeadline,
    daysToDeadline: soonestDays,
  };
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
