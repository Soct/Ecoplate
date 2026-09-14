import { describe, expect, it } from 'vitest';
import { calculateScore } from './calculateScore';
import type { IngredientCandidate } from '../types';

function candidate(
  family: IngredientCandidate['family'],
  source: IngredientCandidate['source'] = 'user',
  extra: Partial<IngredientCandidate> = {},
): IngredientCandidate {
  return {
    id: `${source}-${family}`,
    family,
    source,
    selected: true,
    validated: source !== 'vision',
    ...extra,
  };
}

describe('calculateScore', () => {
  it('retourne ? sans aliment', () => {
    expect(calculateScore([]).grade).toBe('?');
  });

  it.each([
    ['beef', 'E'],
    ['pork', 'D'],
    ['poultry', 'C'],
    ['fish', 'C'],
    ['dairy', 'C'],
    ['eggs', 'B'],
    ['legumes', 'A'],
    ['plants', 'A'],
  ] as const)('classe %s au niveau %s', (family, grade) => {
    expect(calculateScore([candidate(family)]).grade).toBe(grade);
  });

  it('utilise le niveau le plus prudent sans quantités complètes', () => {
    const result = calculateScore([candidate('plants'), candidate('beef')]);
    expect(result.grade).toBe('E');
    expect(result.usedQuantities).toBe(false);
  });

  it('pondère les profils quand toutes les quantités sont déclarées', () => {
    const result = calculateScore([
      candidate('beef', 'user', { quantityG: 10 }),
      candidate('plants', 'user', { quantityG: 990 }),
    ]);
    expect(result.grade).toBe('A');
    expect(result.usedQuantities).toBe(true);
    expect(result.referenceImpact).toBeCloseTo(0.98574, 4);
  });

  it('ignore les éléments désélectionnés', () => {
    const result = calculateScore([
      candidate('beef', 'user', { selected: false }),
      candidate('plants'),
    ]);
    expect(result.grade).toBe('A');
  });

  it('rejette une prédiction visuelle de faible confiance', () => {
    const result = calculateScore([
      candidate('plants', 'vision', { confidence: 0.2, validated: false }),
    ]);
    expect(result.grade).toBe('?');
    expect(result.confidenceLabel).toBe('faible');
  });

  it('accepte la même prédiction après validation humaine', () => {
    const result = calculateScore([
      candidate('plants', 'vision', { confidence: 0.2, validated: true }),
    ]);
    expect(result.grade).toBe('A');
    expect(result.confidenceLabel).toBe('confirmée');
  });

  it('rejette deux familles visuelles trop proches', () => {
    const result = calculateScore([
      candidate('plants', 'vision', { confidence: 0.51 }),
      candidate('dairy', 'vision', { confidence: 0.47, selected: false, id: 'vision-dairy' }),
    ]);
    expect(result.grade).toBe('?');
    expect(result.explanation).toContain('trop proches');
  });

  it('ne confond pas ambiguïté et impact élevé', () => {
    const result = calculateScore([
      candidate('beef', 'vision', { confidence: 0.24 }),
    ]);
    expect(result.grade).not.toBe('E');
  });
});
