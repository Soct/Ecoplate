import type { FamilyId, VisionPrediction } from '../types';

export const DEFAULT_DISPLAY_THRESHOLD = 0.1;
export const MINIMUM_DISPLAY_RESULTS = 3;

const COMPETING_MEAT_FAMILIES = new Set<FamilyId>(['beef', 'pork', 'poultry', 'fish']);

export function filterCompetingPredictions(predictions: VisionPrediction[]): VisionPrediction[] {
  let strongestMeat: VisionPrediction | undefined;
  predictions.forEach((prediction) => {
    if (!prediction.family || !COMPETING_MEAT_FAMILIES.has(prediction.family)) return;
    if (!strongestMeat || prediction.confidence > strongestMeat.confidence) {
      strongestMeat = prediction;
    }
  });

  return predictions.filter((prediction) =>
    !prediction.family
    || !COMPETING_MEAT_FAMILIES.has(prediction.family)
    || prediction === strongestMeat,
  );
}

export function effectiveDisplayThreshold(
  predictions: VisionPrediction[],
  _threshold = DEFAULT_DISPLAY_THRESHOLD,
  minimumResults = MINIMUM_DISPLAY_RESULTS,
): number {
  const boundedThreshold = Math.min(1, Math.max(0, _threshold));
  if (minimumResults <= 0) return boundedThreshold;
  if (predictions.length < minimumResults) return 0;

  const resultsAtRequestedThreshold = predictions.filter(
    (prediction) => prediction.confidence >= boundedThreshold,
  );
  if (resultsAtRequestedThreshold.length >= minimumResults) return boundedThreshold;

  const sortedPredictions = [...predictions].sort((a, b) => b.confidence - a.confidence);
  return Math.min(boundedThreshold, sortedPredictions[minimumResults - 1]?.confidence ?? 0);
}

export function predictionsAboveThreshold(
  predictions: VisionPrediction[],
  threshold = DEFAULT_DISPLAY_THRESHOLD,
): VisionPrediction[] {
  const displayThreshold = effectiveDisplayThreshold(predictions, threshold);
  return predictions.filter((prediction) => prediction.confidence >= displayThreshold);
}
