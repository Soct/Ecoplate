export const FAMILY_IDS = [
  'beef',
  'pork',
  'poultry',
  'fish',
  'dairy',
  'eggs',
  'legumes',
  'plants',
] as const;

export type FamilyId = (typeof FAMILY_IDS)[number];
export type CandidateSource = 'vision' | 'text' | 'user';
export type ClimateGrade = 'A' | 'B' | 'C' | 'D' | 'E' | '?';

export interface VisionPrediction {
  originalLabel: string;
  confidence: number;
  family?: FamilyId;
  mappingNote?: string;
}

export interface IngredientCandidate {
  id: string;
  family: FamilyId;
  source: CandidateSource;
  evidenceSources?: CandidateSource[];
  selected: boolean;
  validated: boolean;
  confidence?: number;
  originalLabel?: string;
  quantityG?: number;
}

export interface UnknownTerm {
  term: string;
  quantityG?: number;
}

export interface TextExtraction {
  candidates: IngredientCandidate[];
  unknownTerms: UnknownTerm[];
}

export interface ClimateProfile {
  id: FamilyId;
  labelFr: string;
  shortLabel: string;
  climateLevel: Exclude<ClimateGrade, '?'>;
  impactFactor: number;
  source: string;
  sourceVersion: string;
  sourceUrl: string;
  recordId: string;
  referenceProduct: string;
  indicator: string;
  unit: string;
  dqr: number;
  rationale: string;
  alternative?: string;
  limitations: string[];
}

export interface ClimateResult {
  grade: ClimateGrade;
  title: string;
  explanation: string;
  confidence: number | null;
  confidenceLabel: 'élevée' | 'moyenne' | 'faible' | 'confirmée' | 'indisponible';
  mainFactors: ClimateProfile[];
  assumptions: string[];
  usedQuantities: boolean;
  referenceImpact?: number;
}

export interface MergeResult {
  candidates: IngredientCandidate[];
  contradictions: string[];
}

export interface ScoreOptions {
  lowConfidenceThreshold?: number;
  ambiguityMargin?: number;
}
