import { describe, expect, it } from 'vitest';
import { normalize, normalizeIngredients } from './normalizeIngredients';

describe('normalize', () => {
  it('normalise casse, accents et apostrophes', () => {
    expect(normalize('  PÂTES à l’ŒUF  ')).toBe('pates a l oeuf');
  });
});

describe('normalizeIngredients', () => {
  it('reproduit le cas métier du plan', () => {
    const result = normalizeIngredients('150 g de bœuf haché, tomates et lentilles');
    expect(result.candidates.map((item) => item.family)).toEqual([
      'beef',
      'plants',
      'legumes',
    ]);
    expect(result.candidates[0]?.quantityG).toBe(150);
  });

  it('convertit les kilogrammes en grammes', () => {
    const result = normalizeIngredients('0,25 kg de tofu');
    expect(result.candidates[0]?.quantityG).toBe(250);
  });

  it.each([
    ['jambon', 'pork'],
    ['dinde', 'poultry'],
    ['saumon', 'fish'],
    ['mozzarella', 'dairy'],
    ['omelette', 'eggs'],
    ['pois chiches', 'legumes'],
    ['pommes de terre', 'plants'],
  ] as const)('mappe %s vers %s', (text, family) => {
    expect(normalizeIngredients(text).candidates[0]?.family).toBe(family);
  });

  it('tolère une faute simple documentée', () => {
    expect(normalizeIngredients('pouller').candidates[0]?.family).toBe('poultry');
  });

  it('affiche les ingrédients inconnus', () => {
    const result = normalizeIngredients('150 g de seitan, tomate');
    expect(result.unknownTerms).toEqual([{ term: 'seitan', quantityG: 150 }]);
    expect(result.candidates[0]?.family).toBe('plants');
  });

  it('retourne une extraction vide pour un texte vide', () => {
    expect(normalizeIngredients('  ')).toEqual({ candidates: [], unknownTerms: [] });
  });
});
