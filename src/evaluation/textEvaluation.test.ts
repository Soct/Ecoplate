import { describe, expect, it } from 'vitest';
import cases from '../../evaluation/text-cases.json';
import { normalizeIngredients } from '../text/normalizeIngredients';
import type { FamilyId } from '../types';

describe('jeu d’évaluation textuelle documenté', () => {
  it.each(cases)('$id reconnaît les familles attendues', (testCase) => {
    const result = normalizeIngredients(testCase.input);
    const actual = [...new Set(result.candidates.map((item) => item.family))].sort();
    expect(actual).toEqual([...(testCase.families as FamilyId[])].sort());
    if ('quantityG' in testCase) {
      expect(result.candidates[0]?.quantityG).toBe(testCase.quantityG);
    }
    if ('unknown' in testCase) {
      expect(result.unknownTerms.map((item) => item.term)).toEqual(testCase.unknown);
    }
  });
});
