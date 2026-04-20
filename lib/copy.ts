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
  networkGapDefault: "recruit an advisor with aligned healthcare compliance background",
  networkGapTemplate: (archetype: string) =>
    `consider recruiting advisor with ${archetype.toLowerCase()} background`,
} as const;
