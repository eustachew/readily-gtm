export type Advisor = {
  name: string;
  organization: string;
};

export type Target = {
  organization: string;
};

export type Person = {
  name: string;
  role: string;
  linkedinUrl: string | null;
  sourceUrls: string[];
};

export type Match = {
  advisorName: string;
  advisorOrganization: string;
  targetOrganization: string;
  targetName: string;
  targetRole: string;
  targetLinkedIn: string | null;
};

export type MatchResponse = {
  matches: Match[];
  notes?: string;
};
