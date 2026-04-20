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

  exportCsv: "Export CSV",
  emptyState: "Results will appear here.",
  emptyResultsTitle: "No verifiable contacts found",
  emptyResultsBody:
    "We'd rather show nothing than fabricate. Try adjusting the target list or re-running.",
  error: "Something broke. Check the server logs.",

  columns: {
    score: "Score",
    targetOrg: "Target Org",
    targetName: "Contact",
    verifiability: "Evidence",
    reasoning: "Why",
    reachableVia: "Reachable via",
    action: "",
  },

  draftIntro: "Draft intro",
  draftModal: {
    title: "Intro request",
    subtitleTemplate: (advisor: string, target: string) =>
      `From you → ${advisor} → ${target}`,
    loading: "Drafting a forwardable intro…",
    emailHeading: "Email to your advisor",
    blurbHeading: "Forwardable blurb",
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
