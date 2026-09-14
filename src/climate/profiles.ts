import rawProfiles from './profiles.json';
import type { ClimateProfile, FamilyId } from '../types';

export const profiles = rawProfiles as ClimateProfile[];

export const profileById = new Map<FamilyId, ClimateProfile>(
  profiles.map((profile) => [profile.id, profile]),
);

export function getProfile(family: FamilyId): ClimateProfile {
  const profile = profileById.get(family);
  if (!profile) {
    throw new Error(`Profil environnemental manquant : ${family}`);
  }
  return profile;
}
