import { describe, expect, it } from 'vitest';
import type { VisionPrediction } from '../types';
import { predictionsAboveThreshold } from './displayPolicy';

const predictions: VisionPrediction[] = [
  { originalLabel: 'beef', family: 'beef', confidence: 0.62 },
  { originalLabel: 'plants', family: 'plants', confidence: 0.1 },
  { originalLabel: 'eggs', family: 'eggs', confidence: 0.099 },
];

describe('predictionsAboveThreshold', () => {
  it('conserve toutes les prédictions égales ou supérieures au seuil', () => {
    expect(predictionsAboveThreshold(predictions, 0.1).map((item) => item.family)).toEqual([
      'beef',
      'plants',
    ]);
  });

  it('borne un seuil invalide entre zéro et un', () => {
    expect(predictionsAboveThreshold(predictions, -1)).toHaveLength(3);
    expect(predictionsAboveThreshold(predictions, 2)).toHaveLength(0);
  });
});
