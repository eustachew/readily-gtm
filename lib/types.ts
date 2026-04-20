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
  icpFit: number;
  connectionStrength: number;
  connectionRationale: string;
  verifiability: Verifiability;
  matchScore: number;
  suggestedAdvisorArchetype: string | null;
};

export type MatchResponse = {
  matches: Match[];
  notes?: string;
};

export type DraftRequest = {
  advisorName: string;
  advisorOrganization: string;
  targetName: string;
  targetRole: string;
  targetOrganization: string;
  connectionRationale: string;
};

export type DraftResponse = {
  email: string;
  forwardableBlurb: string;
};
