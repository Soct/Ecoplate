import type { FamilyId } from '../types';
import { FAMILY_IDS } from '../types';

export interface EvaluationPrediction {
  family?: FamilyId;
  confidence: number;
}

export interface VisionEvaluationCase {
  expectedFamily?: FamilyId;
  predictions: EvaluationPrediction[];
  rejected: boolean;
  correctedByUser: boolean;
  latencyMs: number;
}

export interface EvaluationMetrics {
  sampleCount: number;
  top1Accuracy: number;
  top3Accuracy: number;
  rejectionRate: number;
  usefulRejectionRate: number;
  correctionRate: number;
  latencyMedianMs: number;
  latencyP95Ms: number;
}

export interface FamilyMetrics {
  family: FamilyId;
  support: number;
  precision: number;
  recall: number;
  f1: number;
}

export type DecisionLabel = FamilyId | 'unmapped' | 'rejected';

export interface ClassificationStudy {
  sampleCount: number;
  accuracy: number;
  top1Accuracy: number;
  top3Accuracy: number;
  macroF1: number;
  rejectionRate: number;
  acceptedAccuracy: number;
  perFamily: FamilyMetrics[];
  confusionLabels: DecisionLabel[];
  confusionMatrix: number[][];
}

export interface RejectionPolicy {
  confidenceThreshold: number;
  ambiguityMargin: number;
}

export interface ThresholdStudyPoint extends ClassificationStudy {
  confidenceThreshold: number;
  ambiguityMargin: number;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

export function calculateEvaluationMetrics(
  cases: VisionEvaluationCase[],
): EvaluationMetrics {
  const inScope = cases.filter((item) => item.expectedFamily !== undefined);
  const top1 = inScope.filter(
    (item) => item.predictions[0]?.family === item.expectedFamily,
  ).length;
  const top3 = inScope.filter((item) =>
    item.predictions.slice(0, 3).some((prediction) => prediction.family === item.expectedFamily),
  ).length;
  const rejected = cases.filter((item) => item.rejected);
  const usefulRejections = rejected.filter((item) =>
    item.expectedFamily === undefined ||
    !item.predictions.slice(0, 3).some((prediction) => prediction.family === item.expectedFamily),
  ).length;

  return {
    sampleCount: cases.length,
    top1Accuracy: ratio(top1, inScope.length),
    top3Accuracy: ratio(top3, inScope.length),
    rejectionRate: ratio(rejected.length, cases.length),
    usefulRejectionRate: ratio(usefulRejections, rejected.length),
    correctionRate: ratio(
      cases.filter((item) => item.correctedByUser).length,
      cases.length,
    ),
    latencyMedianMs: percentile(cases.map((item) => item.latencyMs), 0.5),
    latencyP95Ms: percentile(cases.map((item) => item.latencyMs), 0.95),
  };
}

function topMappedPredictions(item: VisionEvaluationCase): EvaluationPrediction[] {
  return item.predictions.filter(
    (prediction): prediction is EvaluationPrediction & { family: FamilyId } =>
      prediction.family !== undefined,
  );
}

export function isRejectedByPolicy(
  item: VisionEvaluationCase,
  policy: RejectionPolicy,
): boolean {
  const mapped = topMappedPredictions(item);
  const first = mapped[0];
  if (!first || first.confidence < policy.confidenceThreshold) return true;
  const secondDifferentFamily = mapped.find(
    (prediction) => prediction.family !== first.family,
  );
  return secondDifferentFamily !== undefined
    && first.confidence - secondDifferentFamily.confidence < policy.ambiguityMargin;
}

export function calculateClassificationStudy(
  cases: VisionEvaluationCase[],
  policy?: RejectionPolicy,
): ClassificationStudy {
  const inScope = cases.filter(
    (item): item is VisionEvaluationCase & { expectedFamily: FamilyId } =>
      item.expectedFamily !== undefined,
  );
  const decisions = inScope.map((item) => {
    const rejected = policy ? isRejectedByPolicy(item, policy) : item.rejected;
    const rawTop1 = item.predictions[0]?.family;
    const predicted: DecisionLabel = rejected
      ? 'rejected'
      : rawTop1 ?? 'unmapped';
    return { item, rejected, rawTop1, predicted };
  });
  const top1Correct = decisions.filter(
    ({ item, rawTop1 }) => rawTop1 === item.expectedFamily,
  ).length;
  const top3Correct = decisions.filter(({ item }) =>
    item.predictions.slice(0, 3).some(
      (prediction) => prediction.family === item.expectedFamily,
    ),
  ).length;
  const correctDecisions = decisions.filter(
    ({ item, predicted }) => predicted === item.expectedFamily,
  ).length;
  const accepted = decisions.filter(({ rejected }) => !rejected);

  const perFamily = FAMILY_IDS.map((family): FamilyMetrics => {
    const support = decisions.filter(({ item }) => item.expectedFamily === family).length;
    const truePositive = decisions.filter(
      ({ item, predicted }) => item.expectedFamily === family && predicted === family,
    ).length;
    const falsePositive = decisions.filter(
      ({ item, predicted }) => item.expectedFamily !== family && predicted === family,
    ).length;
    const precision = ratio(truePositive, truePositive + falsePositive);
    const recall = ratio(truePositive, support);
    return {
      family,
      support,
      precision,
      recall,
      f1: precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall),
    };
  });
  const confusionLabels: DecisionLabel[] = [...FAMILY_IDS, 'unmapped', 'rejected'];
  const confusionMatrix = FAMILY_IDS.map((expected) => confusionLabels.map((predicted) =>
    decisions.filter(
      ({ item, predicted: actual }) => item.expectedFamily === expected && actual === predicted,
    ).length,
  ));

  return {
    sampleCount: inScope.length,
    accuracy: ratio(correctDecisions, inScope.length),
    top1Accuracy: ratio(top1Correct, inScope.length),
    top3Accuracy: ratio(top3Correct, inScope.length),
    macroF1: perFamily.reduce((total, item) => total + item.f1, 0) / FAMILY_IDS.length,
    rejectionRate: ratio(decisions.filter(({ rejected }) => rejected).length, inScope.length),
    acceptedAccuracy: ratio(
      accepted.filter(({ item, predicted }) => predicted === item.expectedFamily).length,
      accepted.length,
    ),
    perFamily,
    confusionLabels,
    confusionMatrix,
  };
}

export function evaluateRejectionThresholds(
  cases: VisionEvaluationCase[],
  confidenceThresholds: number[],
  ambiguityMargin = 0.08,
): ThresholdStudyPoint[] {
  return confidenceThresholds.map((confidenceThreshold) => ({
    confidenceThreshold,
    ambiguityMargin,
    ...calculateClassificationStudy(cases, { confidenceThreshold, ambiguityMargin }),
  }));
}
