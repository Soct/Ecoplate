import type { FamilyId, VisionPrediction } from '../types';

interface MappingRule {
  family: FamilyId;
  patterns: string[];
  note: string;
}

const RULES: MappingRule[] = [
  {
    family: 'beef',
    patterns: ['beef', 'meat loaf', 'meatloaf', 'cheeseburger'],
    note: 'Plat carné associé prudemment à la famille viande rouge ; validation recommandée.',
  },
  {
    family: 'pork',
    patterns: ['pork', 'hotdog', 'hot dog'],
    note: 'Charcuterie probable ; la composition exacte reste à confirmer.',
  },
  {
    family: 'poultry',
    patterns: ['poultry', 'drumstick'],
    note: 'Le libellé peut être ambigu ; confirmer qu’il s’agit bien de volaille.',
  },
  {
    family: 'fish',
    patterns: [
      'fish', 'salmon', 'tuna', 'tench', 'barracouta', 'eel', 'sturgeon',
      'garfish', 'coho', 'rock beauty', 'anemone fish', 'lionfish', 'puffer',
    ],
    note: 'Espèce ou poisson détecté ; le mode de production n’est pas connu.',
  },
  {
    family: 'dairy',
    patterns: ['dairy', 'ice cream', 'pizza', 'carbonara'],
    note: 'Produit laitier probable dans un plat composé ; vérifier les ingrédients.',
  },
  {
    family: 'eggs',
    patterns: ['eggs', 'eggnog'],
    note: 'Préparation contenant probablement des œufs ; composition à confirmer.',
  },
  {
    family: 'legumes',
    patterns: ['legumes', 'guacamole'],
    note: 'Préparation végétale mappée par défaut ; corriger si nécessaire.',
  },
  {
    family: 'plants',
    patterns: [
      'plants',
      'banana', 'lemon', 'orange', 'strawberry', 'pineapple', 'fig', 'granny smith',
      'custard apple', 'pomegranate', 'jackfruit', 'cucumber', 'artichoke',
      'bell pepper', 'broccoli', 'cauliflower', 'cabbage', 'zucchini', 'mushroom',
      'acorn squash', 'butternut squash', 'spaghetti squash', 'mashed potato',
      'corn', 'bagel', 'pretzel', 'French loaf', 'burrito',
    ],
    note: 'Aliment végétal ou féculent directement identifiable dans ImageNet.',
  },
];

export function mapVisionClass(
  originalLabel: string,
  confidence: number,
): VisionPrediction {
  const normalized = originalLabel.toLocaleLowerCase('en');
  const rule = RULES.find(({ patterns }) =>
    patterns.some((pattern) => normalized.includes(pattern.toLocaleLowerCase('en'))),
  );
  return {
    originalLabel,
    confidence,
    family: rule?.family,
    mappingNote: rule?.note,
  };
}

export function mapVisionPredictions(
  predictions: Array<{ categoryName: string; score: number }>,
): VisionPrediction[] {
  return predictions.map(({ categoryName, score }) =>
    mapVisionClass(categoryName, score),
  );
}
