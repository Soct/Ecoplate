import { describe, expect, it } from 'vitest';
import { mapVisionClass, mapVisionPredictions } from './classMapping';

describe('classMapping', () => {
  it.each([
    ['beef', 'beef'],
    ['pork', 'pork'],
    ['poultry', 'poultry'],
    ['fish', 'fish'],
    ['dairy', 'dairy'],
    ['eggs', 'eggs'],
    ['legumes', 'legumes'],
    ['plants', 'plants'],
    ['banana', 'plants'],
    ['cheeseburger', 'beef'],
    ['hotdog, hot dog, red hot', 'pork'],
    ['coho, cohoe, coho salmon', 'fish'],
    ['ice cream, icecream', 'dairy'],
  ] as const)('mappe %s vers %s', (label, family) => {
    expect(mapVisionClass(label, 0.8).family).toBe(family);
  });

  it('conserve une classe sans mapping', () => {
    const result = mapVisionClass('sports car', 0.92);
    expect(result.family).toBeUndefined();
    expect(result.originalLabel).toBe('sports car');
  });

  it('conserve toutes les classes fournies par le modèle', () => {
    const input = Array.from({ length: 8 }, (_, index) => ({
      categoryName: `class ${index}`,
      score: 1 - index / 10,
    }));
    expect(mapVisionPredictions(input)).toHaveLength(8);
  });
});
