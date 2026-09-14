import { getProfile } from './profiles';
import type {
  ClimateGrade,
  ClimateResult,
  IngredientCandidate,
  ScoreOptions,
} from '../types';

const GRADE_RANK: Record<Exclude<ClimateGrade, '?'>, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
};

const TITLES: Record<ClimateGrade, string> = {
  A: 'Impact estimé faible',
  B: 'Impact estimé plutôt faible',
  C: 'Impact estimé intermédiaire',
  D: 'Impact estimé plutôt élevé',
  E: 'Impact estimé élevé',
  '?': 'Résultat incertain',
};

function gradeFromImpact(impact: number): Exclude<ClimateGrade, '?'> {
  if (impact <= 2) return 'A';
  if (impact <= 4) return 'B';
  if (impact <= 7) return 'C';
  if (impact <= 15) return 'D';
  return 'E';
}

function confidenceLabel(
  confidence: number | null,
  confirmed: boolean,
): ClimateResult['confidenceLabel'] {
  if (confirmed) return 'confirmée';
  if (confidence === null) return 'indisponible';
  if (confidence >= 0.7) return 'élevée';
  if (confidence >= 0.45) return 'moyenne';
  return 'faible';
}

function unknownResult(reason: string, assumptions: string[]): ClimateResult {
  return {
    grade: '?',
    title: TITLES['?'],
    explanation: reason,
    confidence: null,
    confidenceLabel: 'indisponible',
    mainFactors: [],
    assumptions,
    usedQuantities: false,
  };
}

export function calculateScore(
  allCandidates: IngredientCandidate[],
  options: ScoreOptions = {},
): ClimateResult {
  const lowThreshold = options.lowConfidenceThreshold ?? 0.35;
  const ambiguityMargin = options.ambiguityMargin ?? 0.08;
  const selected = allCandidates.filter((candidate) => candidate.selected);

  if (selected.length === 0) {
    return unknownResult(
      'Aucun aliment n’est retenu. Ajoutez ou validez au moins une famille.',
      ['Le score n’est jamais déduit d’une image sans catégorie exploitable.'],
    );
  }

  const confirmed = selected.some(
    (candidate) => candidate.source !== 'vision' || candidate.validated,
  );
  const selectedVision = selected.filter(
    (candidate) => candidate.source === 'vision',
  );
  const confidenceValues = selectedVision
    .map((candidate) => candidate.confidence)
    .filter((value): value is number => value !== undefined);
  const confidence = confidenceValues.length
    ? Math.max(...confidenceValues)
    : null;

  if (!confirmed && confidence !== null && confidence < lowThreshold) {
    return {
      ...unknownResult(
        `La meilleure suggestion retenue atteint seulement ${Math.round(confidence * 100)} %, sous le seuil de ${Math.round(lowThreshold * 100)} %.`,
        ['Confirmez une catégorie ou complétez la description pour obtenir un indicateur.'],
      ),
      confidence,
      confidenceLabel: 'faible',
    };
  }

  const rankedVision = allCandidates
    .filter(
      (candidate) =>
        candidate.source === 'vision' && candidate.confidence !== undefined,
    )
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const firstVision = rankedVision[0];
  const secondVision = rankedVision[1];
  if (
    !confirmed &&
    firstVision?.confidence !== undefined &&
    secondVision?.confidence !== undefined &&
    firstVision.family !== secondVision.family &&
    firstVision.confidence - secondVision.confidence < ambiguityMargin
  ) {
    return {
      ...unknownResult(
        'Les deux meilleures familles visuelles sont trop proches pour produire une note fiable.',
        ['Sélectionnez la bonne famille ou décrivez les ingrédients visibles.'],
      ),
      confidence: firstVision.confidence,
      confidenceLabel: confidenceLabel(firstVision.confidence, false),
    };
  }

  const profiles = selected.map((candidate) => getProfile(candidate.family));
  const allQuantified = selected.every(
    (candidate) => candidate.quantityG !== undefined && candidate.quantityG > 0,
  );

  let grade: Exclude<ClimateGrade, '?'>;
  let referenceImpact: number | undefined;
  if (allQuantified) {
    const totalMass = selected.reduce(
      (sum, candidate) => sum + (candidate.quantityG ?? 0),
      0,
    );
    referenceImpact = selected.reduce((sum, candidate) => {
      const profile = getProfile(candidate.family);
      return sum + profile.impactFactor * ((candidate.quantityG ?? 0) / totalMass);
    }, 0);
    grade = gradeFromImpact(referenceImpact);
  } else {
    grade = profiles.reduce((worst, profile) =>
      GRADE_RANK[profile.climateLevel] > GRADE_RANK[worst]
        ? profile.climateLevel
        : worst,
    'A' as Exclude<ClimateGrade, '?'>);
  }

  const mainFactors = [...profiles]
    .sort((a, b) => b.impactFactor - a.impactFactor)
    .filter(
      (profile, index, list) =>
        list.findIndex((item) => item.id === profile.id) === index,
    )
    .slice(0, 3);
  const main = mainFactors[0];
  const factorText = main
    ? `Le facteur principal est « ${main.shortLabel} », rattaché au profil de référence « ${main.referenceProduct} ».`
    : '';
  const quantityText = allQuantified
    ? 'Les masses déclarées pondèrent les profils de référence.'
    : 'Sans masses complètes, la famille au niveau le plus élevé détermine la note par prudence.';

  return {
    grade,
    title: TITLES[grade],
    explanation: `${factorText} ${quantityText}`.trim(),
    confidence,
    confidenceLabel: confidenceLabel(confidence, confirmed),
    mainFactors,
    assumptions: [
      'Indicateur pédagogique, non officiel et non nutritionnel.',
      'Les profils AGRIBALYSE servent de repères de classement, pas de mesure de l’assiette.',
      'L’origine, la production, la recette et la cuisson réelles restent inconnues.',
      allQuantified
        ? 'Les quantités sont déclarées par l’utilisateur et ne proviennent pas de la photo.'
        : 'Les quantités ne sont pas connues ou seulement partielles.',
    ],
    usedQuantities: allQuantified,
    referenceImpact,
  };
}
