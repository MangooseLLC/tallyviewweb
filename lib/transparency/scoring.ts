/**
 * Transparency Score computation.
 *
 * Takes raw 990 data (from ProPublica or internal) and produces a 0-100 score
 * across four dimensions: financial health, governance, transparency, and compliance.
 */

export interface ScoringInput {
  ein: string;
  name: string;
  state?: string;
  nteeCode?: string;
  filingYear?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  totalAssets?: number;
  programExpenses?: number;
  managementExpenses?: number;
  fundraisingExpenses?: number;
  netAssets?: number;
  compensationTotal?: number;
  boardSize?: number;
  independentMembers?: number;
  has990Filed?: boolean;
  hasAudit?: boolean;
  hasConflictPolicy?: boolean;
  hasWhistleblowerPolicy?: boolean;
}

export interface ScoreResult {
  overallScore: number;
  financialHealth: number;
  governanceScore: number;
  transparencyScore: number;
  complianceScore: number;
  programExpenseRatio: number | null;
}

export function computeTransparencyScore(input: ScoringInput): ScoreResult {
  const financial = computeFinancialHealth(input);
  const governance = computeGovernance(input);
  const transparency = computeTransparency(input);
  const compliance = computeCompliance(input);

  const overallScore = Math.round(
    financial * 0.30 + governance * 0.25 + transparency * 0.25 + compliance * 0.20
  );

  const programExpenseRatio = input.totalExpenses && input.programExpenses
    ? input.programExpenses / input.totalExpenses
    : null;

  return {
    overallScore: clamp(overallScore),
    financialHealth: clamp(financial),
    governanceScore: clamp(governance),
    transparencyScore: clamp(transparency),
    complianceScore: clamp(compliance),
    programExpenseRatio,
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function computeFinancialHealth(input: ScoringInput): number {
  let score = 50;

  if (input.totalExpenses && input.programExpenses) {
    const ratio = input.programExpenses / input.totalExpenses;
    if (ratio >= 0.75) score += 25;
    else if (ratio >= 0.65) score += 15;
    else if (ratio >= 0.50) score += 5;
    else score -= 10;
  }

  if (input.totalExpenses && input.managementExpenses) {
    const overhead = input.managementExpenses / input.totalExpenses;
    if (overhead <= 0.15) score += 15;
    else if (overhead <= 0.25) score += 5;
    else score -= 10;
  }

  if (input.totalRevenue && input.totalExpenses) {
    const margin = (input.totalRevenue - input.totalExpenses) / input.totalRevenue;
    if (margin > 0 && margin < 0.30) score += 10;
    else if (margin >= 0.30) score += 5;
    else score -= 5;
  }

  return score;
}

function computeGovernance(input: ScoringInput): number {
  let score = 40;

  if (input.boardSize) {
    if (input.boardSize >= 5 && input.boardSize <= 15) score += 20;
    else if (input.boardSize >= 3) score += 10;
  }

  if (input.independentMembers && input.boardSize) {
    const indRatio = input.independentMembers / input.boardSize;
    if (indRatio >= 0.67) score += 20;
    else if (indRatio >= 0.50) score += 10;
  }

  if (input.hasConflictPolicy) score += 10;
  if (input.hasWhistleblowerPolicy) score += 10;

  return score;
}

function computeTransparency(input: ScoringInput): number {
  let score = 30;

  if (input.has990Filed) score += 30;
  if (input.hasAudit) score += 25;
  if (input.totalRevenue != null) score += 5;
  if (input.programExpenses != null) score += 5;
  if (input.compensationTotal != null) score += 5;

  return score;
}

function computeCompliance(input: ScoringInput): number {
  let score = 50;

  if (input.has990Filed) score += 25;
  if (input.filingYear && input.filingYear >= new Date().getFullYear() - 2) score += 15;
  if (input.hasConflictPolicy) score += 5;
  if (input.hasWhistleblowerPolicy) score += 5;

  return score;
}
