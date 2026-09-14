import { describe, expect, it } from 'vitest';
import { mergeCandidates } from './mergeCandidates';
import type { IngredientCandidate } from '../types';

function item(
  family: IngredientCandidate['family'],
  source: IngredientCandidate['source'],
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

describe('mergeCandidates', () => {
  it('déduplique une famille et conserve toutes les provenances', () => {
    const result = mergeCandidates([
      [item('plants', 'vision', { confidence: 0.8 })],
      [item('plants', 'text')],
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.source).toBe('text');
    expect(result.candidates[0]?.evidenceSources).toEqual(['vision', 'text']);
    expect(result.candidates[0]?.confidence).toBe(0.8);
  });

  it('donne la priorité à une correction utilisateur', () => {
    const result = mergeCandidates([
      [item('dairy', 'vision')],
      [item('dairy', 'text')],
      [item('dairy', 'user')],
    ]);
    expect(result.candidates[0]?.source).toBe('user');
  });

  it('signale une contradiction entre vision et déclaration', () => {
    const result = mergeCandidates([
      [item('beef', 'vision')],
      [item('legumes', 'text')],
    ]);
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0]).toContain('prioritaire');
  });

  it('ne signale pas une contradiction lorsqu’une famille concorde', () => {
    const result = mergeCandidates([
      [item('plants', 'vision')],
      [item('plants', 'text'), item('legumes', 'text')],
    ]);
    expect(result.contradictions).toEqual([]);
  });
});
