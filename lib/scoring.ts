export type Verifiability = "verified" | "likely" | "inferred";

export type VerifiabilityResult = {
  level: Verifiability;
  multiplier: number;
};

export function deriveVerifiability(
  sourceCount: number,
  linkedinVerified: boolean,
): VerifiabilityResult {
  if (sourceCount >= 2 && linkedinVerified) {
    return { level: "verified", multiplier: 1.0 };
  }
  if ((sourceCount >= 1 && linkedinVerified) || sourceCount >= 2) {
    return { level: "likely", multiplier: 0.75 };
  }
  return { level: "inferred", multiplier: 0.4 };
}

export type PersonaRank = 1 | 2 | 3 | 4 | 5 | null;

export type IcpClassification = {
  rank: PersonaRank;
  icpFit: number;
};

export function classifyRole(role: string): IcpClassification {
  const r = role.toLowerCase();
  const isCompliance = /compliance/.test(r);
  const isRegulatory = /regulatory|\bregulator\b|regulations/.test(r);
  const isAudit = /audit/.test(r);
  const isChief =
    /\bchief\b|\bcco\b|\bcro\b|\bchief compliance\b|\bchief regulatory\b/.test(
      r,
    );
  const isVP = /\bvp\b|\bsvp\b|vice president/.test(r);
  const isSeniorDirector = /senior director|sr\.? director/.test(r);
  const hasDirector = /director/.test(r);
  const coreDomain = isCompliance || isRegulatory;

  if (isChief && coreDomain) return { rank: 1, icpFit: 1.0 };
  if (isChief && isAudit) return { rank: 5, icpFit: 0.6 };
  if ((isVP || isSeniorDirector) && coreDomain) return { rank: 3, icpFit: 0.6 };
  if ((isVP || isSeniorDirector) && isAudit) return { rank: 5, icpFit: 0.6 };
  if (hasDirector && (coreDomain || isAudit)) return { rank: 4, icpFit: 0.6 };
  if (coreDomain || isAudit) return { rank: null, icpFit: 0.25 };
  return { rank: null, icpFit: 0.25 };
}

export function computeMatchScore({
  icpFit,
  connectionStrength,
  verifiabilityMultiplier,
}: {
  icpFit: number;
  connectionStrength: number;
  verifiabilityMultiplier: number;
}): number {
  return Math.round(icpFit * connectionStrength * verifiabilityMultiplier);
}
