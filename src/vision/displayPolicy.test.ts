import { describe, expect, it } from 'vitest';
import type { VisionPrediction } from '../types';
import {
  effectiveDisplayThreshold,
  filterCompetingPredictions,
  predictionsAboveThreshold,
} from './displayPolicy';

const predictions: VisionPrediction[] = [
  { originalLabel: 'beef', family: 'beef', confidence: 0.62 },
  { originalLabel: 'plants', family: 'plants', confidence: 0.1 },
  { originalLabel: 'eggs', family: 'eggs', confidence: 0.099 },
];

describe('predictionsAboveThreshold', () => {
  it('descend le seuil pour afficher au moins trois prédictions', () => {
    expect(predictionsAboveThreshold(predictions, 0.1).map((item) => item.family)).toEqual([
      'beef',
      'plants',
      'eggs',
    ]);
  });

  it('choisit le score du troisième résultat, même si le seuil choisi est inférieur', () => {
    expect(effectiveDisplayThreshold([
      ...predictions,
      { originalLabel: 'fish', family: 'fish', confidence: 0.12 },
    ], 0.1)).toBe(0.1);
  });

  it('inclut les égalités au seuil minimal', () => {
    expect(predictionsAboveThreshold(predictions, -1)).toHaveLength(3);
    expect(predictionsAboveThreshold(predictions, 2)).toHaveLength(3);
  });
});

describe('filterCompetingPredictions', () => {
  it('conserve uniquement la viande la mieux détectée', () => {
    const filtered = filterCompetingPredictions([
      { originalLabel: 'pork', family: 'pork', confidence: 0.72 },
      { originalLabel: 'beef', family: 'beef', confidence: 0.81 },
      { originalLabel: 'plants', family: 'plants', confidence: 0.2 },
    ]);

    expect(filtered.map((prediction) => prediction.family)).toEqual(['beef', 'plants']);
  });
});
