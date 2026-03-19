/**
 * TypeScript enums mirroring TallyviewTypes.sol
 * Source of truth: tallyview-contracts/contracts/libraries/TallyviewTypes.sol
 */

export enum AnomalySeverity {
  Info = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export enum AnomalyCategory {
  FinancialHealth = 0,
  Governance = 1,
  FraudPattern = 2,
  CompensationOutlier = 3,
  VendorConcentration = 4,
  ExpenseAllocation = 5,
  RevenueAnomaly = 6,
  RelatedParty = 7,
  DocumentProvenance = 8,
  Custom = 9,
}

export enum AnomalyStatus {
  New = 0,
  Reviewed = 1,
  Resolved = 2,
  Escalated = 3,
}

export enum EntityType {
  Person = 0,
  Vendor = 1,
  PostalAddress = 2,
}

export enum RelationshipType {
  BoardMember = 0,
  Executive = 1,
  KeyEmployee = 2,
  VendorPayee = 3,
  RegisteredAddress = 4,
  MailingAddress = 5,
  RelatedParty = 6,
  Custom = 7,
}

export enum RuleType {
  SpendingCap = 0,
  OverheadRatio = 1,
  CustomThreshold = 2,
}

export enum RuleStatus {
  Compliant = 0,
  AtRisk = 1,
  Violated = 2,
}

export enum DeadlineStatus {
  Pending = 0,
  Approaching = 1,
  Overdue = 2,
  Met = 3,
}

export enum EvidenceClassification {
  Tip = 0,
  FinancialRecord = 1,
  AnalysisReport = 2,
  WitnessStatement = 3,
  CommunicationRecord = 4,
  PublicFiling = 5,
  InternalDocument = 6,
  AIGeneratedBrief = 7,
  Other = 8,
}

export enum InvestigationStage {
  Tip = 0,
  Analysis = 1,
  Discovery = 2,
  Filing = 3,
  Recovery = 4,
  Closed = 5,
}

export enum EdgeStatus {
  Active = 0,
  Inactive = 1,
}

export enum SealStatus {
  Unsealed = 0,
  Sealed = 1,
}
