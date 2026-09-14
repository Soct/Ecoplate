import { describe, expect, it } from 'vitest';
import { profiles } from './profiles';
import { FAMILY_IDS } from '../types';

describe('profils environnementaux', () => {
  it('couvre exactement les huit familles', () => {
    expect(profiles.map((profile) => profile.id).sort()).toEqual([...FAMILY_IDS].sort());
  });

  it('conserve la traçabilité AGRIBALYSE', () => {
    profiles.forEach((profile) => {
      expect(profile.source).toBe('AGRIBALYSE');
      expect(profile.sourceVersion).toContain('3.2');
      expect(profile.recordId).not.toBe('');
      expect(profile.unit).toContain('kg CO2e');
      expect(profile.limitations.length).toBeGreaterThan(0);
      expect(profile.impactFactor).toBeGreaterThan(0);
    });
  });
});
