export const copy = {
  appTitle: "Warm Intro Engine",
  appSubtitle:
    "Paste your advisors and target organizations. We'll map the compliance decision-makers worth an intro.",

  advisorsLabel: "Advisors",
  advisorsHint: "One per line — Name, Organization",
  advisorsPlaceholder:
    "Aditi Rao, Kaiser Permanente\nAlbert Chen, Blue Shield of California",

  targetsLabel: "Target organizations",
  targetsHint: "One organization per line",
  targetsPlaceholder: "L.A. Care Health Plan\nCalOptima\nSan Francisco Health Plan",

  uploadCsv: "Upload CSV",
  submit: "Find warm intros",
  submitting: "Searching public signals…",

  cacheBanner: "Cached from earlier run",
  cacheClear: "Clear cache",

  loadingMessages: {
    finding: (target: string) =>
      `Finding compliance decision-makers at ${target}…`,
    scoring: (target: string) => `Scoring connections at ${target}…`,
    verifying: (target: string) => `Verifying profiles at ${target}…`,
  },

  exportCsv: "Export CSV",
  emptyState: "Results will appear here.",
  emptyResultsTitle: "No verifiable contacts found",
  emptyResultsBody:
    "We'd rather show nothing than fabricate. Try adjusting the target list or re-running.",
  error: "Something broke. Check the server logs.",

  columns: {
    priority: "Priority",
    targetOrg: "Target Org",
    targetName: "Contact",
    verifiability: "Evidence",
    reasoning: "Why",
    bestPath: "Best path",
  },

  priority: {
    high: "High",
    medium: "Medium",
    low: "Low",
    networkGap: "Gap",
  },

  priorityCounts: {
    high: "high",
    medium: "medium",
    low: "low",
    networkGapSingular: "network gap",
    networkGapPlural: "network gaps",
  },

  scorePopover: {
    icpLabel: "ICP fit",
    connectionLabel: "Connection",
    verifiabilityLabel: "Verifiability",
    icpTierPrimary: "Primary persona",
    icpTierSecondary: "Secondary persona",
    icpTierWeak: "Weak persona",
    icpDescriptions: {
      rank1: "top-priority buyer for Readily",
      rank2: "top-priority buyer — reg-tracking focus",
      rank3: "tactical daily-workflow buyer",
      rank4: "delegation oversight buyer",
      rank5: "audit and defensibility buyer",
      none: "adjacent to Readily's primary ICP",
    },
    verifiabilityDescriptions: {
      verified: "LinkedIn profile confirmed with 2+ corroborating sources",
      likely: "One solid source — name, role, and org line up",
      inferred: "Thin evidence — treat as a lead to confirm manually",
    },
  },

  draftIntro: "Draft intro",
  draftModal: {
    title: "Intro request",
    subtitleTemplate: (advisor: string, target: string) =>
      `From you → ${advisor} → ${target}`,
    loading: "Drafting a forwardable intro…",
    emailHeading: "Email to your advisor",
    blurbHeading: "Forwardable blurb",
    checklistHeading: "APL readiness checklist",
    copy: "Copy",
    copied: "Copied",
    retry: "Regenerate",
    close: "Close",
    error: "Draft failed. Try again.",
  },

  verifiability: {
    verified: "Verified",
    likely: "Likely",
    inferred: "Inferred",
  },

  verifiabilityHint: {
    verified: "2+ public sources and a LinkedIn profile",
    likely: "One solid source — name, role, and org line up",
    inferred: "Thin evidence — treat as a lead to confirm manually",
  },

  networkGapPrefix: "Network gap —",
  networkGapFallbackArchetype: "healthcare compliance insider",
  networkGapPhrase: (archetype: string) =>
    `this one needs ${indefiniteArticle(archetype)} ${archetype} in your network`,

  timeliness: {
    labels: {
      hot: "Reach now",
      warm: "Timely",
      cool: "On the radar",
      informational: "Active APL",
    },
    none: "No recent APLs",
    deadlinePrefix: "APL deadline",
    passed: "passed",
    today: "today",
    tomorrow: "tomorrow",
    inDays: (n: number) => `in ${n} days`,
    inWeeks: (n: number) => `in ${n} week${n === 1 ? "" : "s"}`,
    inMonths: (n: number) => `in ${n} month${n === 1 ? "" : "s"}`,
    panelHeading: (n: number) => `Applicable APL${n === 1 ? "" : "s"} (${n})`,
    noUpcoming: "No upcoming deadline — recently issued",
    moreDeadlines: (n: number) =>
      `+${n} more dated obligation${n === 1 ? "" : "s"}`,
    emptyPanel: "No recent APLs surfaced for this org's lines of business.",
    sortLabel: "Sort:",
    sortOptions: { path: "Best path", urgency: "Urgency" },
    summaryHot: (n: number) => `${n} org${n === 1 ? "" : "s"} to reach now`,
    summaryWarm: (n: number) => `${n} timely`,
    summarySoonest: "soonest APL deadline",
  },
} as const;

function indefiniteArticle(next: string): "a" | "an" {
  const trimmed = next.trim();
  const first = trimmed.charAt(0).toUpperCase();
  if (!first) return "a";
  if ("AEIO".includes(first)) return "an";
  if (first === "U") return "a";
  const second = trimmed.charAt(1);
  const looksLikeAcronym =
    second && second === second.toUpperCase() && /[A-Z]/.test(second);
  if (looksLikeAcronym && "FHLMNRSX".includes(first)) return "an";
  return "a";
}
