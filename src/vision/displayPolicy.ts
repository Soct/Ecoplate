import type { VisionPrediction } from '../types';

export const DEFAULT_DISPLAY_THRESHOLD = 0.1;

export function predictionsAboveThreshold(
  predictions: VisionPrediction[],
  threshold = DEFAULT_DISPLAY_THRESHOLD,
): VisionPrediction[] {
  const boundedThreshold = Math.min(1, Math.max(0, threshold));
  return predictions.filter((prediction) => prediction.confidence >= boundedThreshold);
}
