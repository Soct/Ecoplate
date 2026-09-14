import { describe, expect, it } from 'vitest';
import {
  calculateClassificationStudy,
  calculateEvaluationMetrics,
  evaluateRejectionThresholds,
  isRejectedByPolicy,
  type VisionEvaluationCase,
} from './metrics';

const cases: VisionEvaluationCase[] = [
  {
    expectedFamily: 'plants',
    predictions: [{ family: 'plants', confidence: 0.8 }],
    rejected: false,
    correctedByUser: false,
    latencyMs: 20,
  },
  {
    expectedFamily: 'beef',
    predictions: [
      { family: 'pork', confidence: 0.5 },
      { family: 'beef', confidence: 0.4 },
    ],
    rejected: false,
    correctedByUser: true,
    latencyMs: 30,
  },
  {
    predictions: [{ confidence: 0.9 }],
    rejected: true,
    correctedByUser: false,
    latencyMs: 100,
  },
];

describe('calculateEvaluationMetrics', () => {
  it('calcule top-1, top-3, rejet et correction', () => {
    const result = calculateEvaluationMetrics(cases);
    expect(result.sampleCount).toBe(3);
    expect(result.top1Accuracy).toBe(0.5);
    expect(result.top3Accuracy).toBe(1);
    expect(result.rejectionRate).toBeCloseTo(1 / 3);
    expect(result.usefulRejectionRate).toBe(1);
    expect(result.correctionRate).toBeCloseTo(1 / 3);
  });

  it('calcule la médiane et le p95', () => {
    const result = calculateEvaluationMetrics(cases);
    expect(result.latencyMedianMs).toBe(30);
    expect(result.latencyP95Ms).toBe(100);
  });

  it('gère un jeu vide', () => {
    expect(calculateEvaluationMetrics([])).toEqual({
      sampleCount: 0,
      top1Accuracy: 0,
      top3Accuracy: 0,
      rejectionRate: 0,
      usefulRejectionRate: 0,
      correctionRate: 0,
      latencyMedianMs: 0,
      latencyP95Ms: 0,
    });
  });
});

describe('étude de classification', () => {
  it('calcule accuracy, macro-F1, mesures par famille et matrice de confusion', () => {
    const result = calculateClassificationStudy(cases);
    expect(result.sampleCount).toBe(2);
    expect(result.top1Accuracy).toBe(0.5);
    expect(result.top3Accuracy).toBe(1);
    expect(result.accuracy).toBe(0.5);
    expect(result.perFamily.find((item) => item.family === 'plants')).toMatchObject({
      support: 1,
      precision: 1,
      recall: 1,
      f1: 1,
    });
    expect(result.perFamily.find((item) => item.family === 'beef')).toMatchObject({
      support: 1,
      recall: 0,
      f1: 0,
    });
    expect(result.confusionMatrix).toHaveLength(8);
    expect(result.confusionLabels).toContain('rejected');
  });

  it('applique le seuil et la marge de rejet', () => {
    const ambiguous: VisionEvaluationCase = {
      expectedFamily: 'beef',
      predictions: [
        { family: 'beef', confidence: 0.55 },
        { family: 'pork', confidence: 0.5 },
      ],
      rejected: false,
      correctedByUser: false,
      latencyMs: 10,
    };
    expect(isRejectedByPolicy(ambiguous, {
      confidenceThreshold: 0.35,
      ambiguityMargin: 0.08,
    })).toBe(true);
    expect(isRejectedByPolicy(ambiguous, {
      confidenceThreshold: 0.6,
      ambiguityMargin: 0,
    })).toBe(true);
  });

  it('compare plusieurs seuils de façon reproductible', () => {
    const points = evaluateRejectionThresholds(cases, [0, 0.7]);
    expect(points).toHaveLength(2);
    expect(points[1]!.rejectionRate).toBeGreaterThan(points[0]!.rejectionRate);
    expect(points[1]!.confidenceThreshold).toBe(0.7);
  });
});
