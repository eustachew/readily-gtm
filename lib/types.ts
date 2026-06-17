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

export type DraftRequest = {
  advisorName: string;
  advisorOrganization: string;
  targetName: string;
  targetRole: string;
  targetOrganization: string;
  connectionRationale: string;
  senderFirstName: string;
};

export type DraftResponse = {
  email: string;
  forwardableBlurb: string;
};
