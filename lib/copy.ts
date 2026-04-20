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
    advisor: "Advisor",
    targetOrg: "Target Org",
    targetName: "Contact",
    targetRole: "Role",
    targetLinkedIn: "LinkedIn",
  },
} as const;
