import { getProfile } from '../climate/profiles';
import type { IngredientCandidate, MergeResult } from '../types';

const SOURCE_PRIORITY = { vision: 1, text: 2, user: 3 } as const;

export function mergeCandidates(
  groups: IngredientCandidate[][],
): MergeResult {
  const flattened = groups.flat();
  const byFamily = new Map<IngredientCandidate['family'], IngredientCandidate>();

  flattened.forEach((candidate) => {
    const existing = byFamily.get(candidate.family);
    if (!existing) {
      byFamily.set(candidate.family, {
        ...candidate,
        evidenceSources: candidate.evidenceSources ?? [candidate.source],
      });
      return;
    }

    const strongest =
      SOURCE_PRIORITY[candidate.source] >= SOURCE_PRIORITY[existing.source]
        ? candidate
        : existing;
    const weakest = strongest === candidate ? existing : candidate;
    byFamily.set(candidate.family, {
      ...weakest,
      ...strongest,
      selected: existing.selected || candidate.selected,
      validated: existing.validated || candidate.validated,
      confidence: existing.confidence ?? candidate.confidence,
      quantityG: strongest.quantityG ?? weakest.quantityG,
      evidenceSources: [
        ...new Set([
          ...(existing.evidenceSources ?? [existing.source]),
          ...(candidate.evidenceSources ?? [candidate.source]),
        ]),
      ],
    });
  });

  const visionFamilies = new Set(
    flattened
      .filter((candidate) => candidate.source === 'vision' && candidate.selected)
      .map((candidate) => candidate.family),
  );
  const declaredFamilies = new Set(
    flattened
      .filter((candidate) => candidate.source !== 'vision' && candidate.selected)
      .map((candidate) => candidate.family),
  );
  const overlap = [...declaredFamilies].some((family) => visionFamilies.has(family));
  const contradictions: string[] = [];
  if (visionFamilies.size > 0 && declaredFamilies.size > 0 && !overlap) {
    const visionLabels = [...visionFamilies].map((family) => getProfile(family).shortLabel);
    const declaredLabels = [...declaredFamilies].map((family) => getProfile(family).shortLabel);
    contradictions.push(
      `L’image suggère ${visionLabels.join(', ')}, tandis que le texte ou la correction indique ${declaredLabels.join(', ')}. La déclaration utilisateur est prioritaire.`,
    );
  }

  return { candidates: [...byFamily.values()], contradictions };
}
