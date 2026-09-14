import { getProfile } from '../climate/profiles';
import type { FamilyId, IngredientCandidate, TextExtraction } from '../types';

const STOP_TERMS = new Set([
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'un',
  'une',
  'avec',
  'et',
  'aux',
  'au',
  'environ',
]);

const SYNONYMS: Record<FamilyId, string[]> = {
  beef: [
    'boeuf', 'bœuf', 'boeufs', 'bœufs', 'steak', 'bifteck', 'burger de boeuf', 'viande rouge',
    'veau', 'agneau', 'mouton', 'entrecote', 'entrecôte',
  ],
  pork: [
    'porc', 'jambon', 'lardon', 'lardons', 'bacon', 'saucisse', 'charcuterie',
    'chorizo', 'salami',
  ],
  poultry: [
    'poulet', 'dinde', 'canard', 'volaille', 'escalope de poulet', 'pouller',
  ],
  fish: [
    'poisson', 'saumon', 'thon', 'sardine', 'cabillaud', 'truite', 'crevette',
    'crevettes', 'moule', 'moules', 'fruit de mer', 'fruits de mer',
  ],
  dairy: [
    'fromage', 'emmental', 'comte', 'comté', 'chevre', 'chèvre', 'mozzarella',
    'parmesan', 'yaourt', 'lait', 'creme', 'crème', 'beurre',
  ],
  eggs: ['oeuf', 'oeufs', 'œuf', 'œufs', 'omelette'],
  legumes: [
    'lentille', 'lentilles', 'tofu', 'pois chiche', 'pois chiches', 'haricot rouge',
    'haricots rouges', 'haricot blanc', 'haricots blancs', 'soja', 'tempeh',
  ],
  plants: [
    'tomate', 'tomates', 'salade', 'carotte', 'carottes', 'brocoli', 'courgette',
    'aubergine', 'navet', 'navets', 'nevet', 'nevets', 'legume', 'legumes', 'légume', 'légumes', 'pomme', 'pommes',
    'banane', 'fraise', 'fraises', 'fruit', 'fruits', 'riz', 'pates', 'pâtes',
    'spaghetti', 'pain', 'cereale', 'céréale', 'cereales', 'céréales',
    'pomme de terre', 'pommes de terre', 'patate', 'patates', 'frite', 'frites',
  ],
};

const LOOKUP = Object.entries(SYNONYMS)
  .flatMap(([family, aliases]) =>
    aliases.map((alias) => ({ family: family as FamilyId, alias: normalize(alias) })),
  )
  .sort((a, b) => b.alias.length - a.alias.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsAlias(segment: string, alias: string): boolean {
  const pattern = escapeRegExp(alias).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${pattern}(?=$|[^a-z0-9])`).test(segment);
}

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9.,;\n\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readQuantity(segment: string): number | undefined {
  const match = segment.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
  if (!match?.[1] || !match[2]) return undefined;
  const number = Number(match[1].replace(',', '.'));
  return match[2].toLowerCase() === 'kg' ? number * 1000 : number;
}

function meaningfulUnknown(segment: string): string | null {
  const cleaned = segment
    .replace(/\d+(?:[.,]\d+)?\s*(?:kg|g)\b/gi, '')
    .replace(/[.,;\-]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_TERMS.has(word))
    .join(' ')
    .trim();
  return cleaned || null;
}

export function normalizeIngredients(input: string): TextExtraction {
  if (!input.trim()) return { candidates: [], unknownTerms: [] };

  const segments = normalize(input)
    .split(/;|\n|,(?!\d)|\bet\b/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const candidates: IngredientCandidate[] = [];
  const unknownTerms: TextExtraction['unknownTerms'] = [];

  segments.forEach((segment, segmentIndex) => {
    const quantityG = readQuantity(segment);
    const matches = LOOKUP.filter(({ alias }) => containsAlias(segment, alias));
    const uniqueFamilies = [...new Set(matches.map((match) => match.family))];

    if (uniqueFamilies.length === 0) {
      const term = meaningfulUnknown(segment);
      if (term) unknownTerms.push({ term, quantityG });
      return;
    }

    uniqueFamilies.forEach((family, familyIndex) => {
      candidates.push({
        id: `text-${segmentIndex}-${family}`,
        family,
        source: 'text',
        evidenceSources: ['text'],
        selected: true,
        validated: true,
        quantityG: familyIndex === 0 ? quantityG : undefined,
        originalLabel: getProfile(family).shortLabel,
      });
    });
  });

  return { candidates, unknownTerms };
}
