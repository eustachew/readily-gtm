export type Advisor = {
  name: string;
  organization: string;
};

export type Target = {
  organization: string;
};

export type Verifiability = "verified" | "likely" | "inferred";

export type Person = {
  name: string;
  role: string;
  linkedinUrl: string | null;
  sourceUrls: string[];
  pastEmployers: string[];
  suggestedAdvisorArchetype: string | null;
};

export type Match = {
  advisorName: string;
  advisorOrganization: string;
  targetOrganization: string;
  targetName: string;
  targetRole: string;
  targetLinkedIn: string;
  targetLinkedInVerified: boolean;
  sourceUrls: string[];
  icpFit: number;
  connectionStrength: number;
  connectionRationale: string;
  verifiability: Verifiability;
  matchScore: number;
  suggestedAdvisorArchetype: string | null;
};

export type AplKeyDate = {
  date: string; // ISO YYYY-MM-DD
  label: string; // what is due / takes effect on this date
};

export type Apl = {
  number: string; // e.g. "APL 25-012"
  title: string;
  issuedDate: string; // as published, ideally ISO (YYYY-MM-DD)
  keyDates: AplKeyDate[]; // every dated obligation found in the APL (past and future)
  complianceDeadline: string | null; // derived: soonest upcoming key date — drives urgency + draft hook
  summary: string;
  whoAffected: string;
  appliesRationale: string; // why this APL applies to THIS org
  advisorArchetype: string | null; // ideal missing advisor to warm-intro on this APL's topic
  sourceUrl: string;
  verifiability: Verifiability;
};

export type TimelinessLabel = "hot" | "warm" | "cool" | "informational";

export type TimelinessScore = {
  score: number; // 0–100, urgency × relevance
  label: TimelinessLabel;
  soonestDeadline: string | null; // ISO of the nearest upcoming deadline
  daysToDeadline: number | null; // negative if past due
};

export type OrgTimeliness = {
  organization: string;
  apls: Apl[];
  timeliness: TimelinessScore;
  notes?: string; // abstention / search notes when apls is empty
};

export type MatchResponse = {
  matches: Match[];
  organizations?: OrgTimeliness[];
  notes?: string;
};

export type ReadinessChecklistItem = {
  item: string; // the action a compliance team must take
  due: string | null; // ISO date if the obligation has one, else null
};

export type DraftRequest = {
  advisorName: string;
  advisorOrganization: string;
  targetName: string;
  targetRole: string;
  targetOrganization: string;
  connectionRationale: string;
  senderFirstName: string;
  apl?: Apl | null; // the org's most urgent applicable APL, if any — grounds the hook + checklist
};

export type DraftResponse = {
  email: string;
  forwardableBlurb: string;
  readinessChecklist?: ReadinessChecklistItem[];
};

export type CandidateAdvisor = {
  name: string;
  role: string; // current title
  organization: string; // where they are now
  pathStrength: number; // 0–100: how plausibly they could warm-intro the target
  bridgeRationale: string; // one line: why they bridge to THIS target
  linkedinUrl: string | null;
  sourceUrls: string[];
  verifiability: Verifiability;
};

export type FindAdvisorsRequest = {
  targetOrganization: string;
};

export type FindAdvisorsResponse = {
  targetOrganization: string;
  candidates: CandidateAdvisor[];
  notes?: string;
};
