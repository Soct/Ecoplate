import { FilesetResolver, ImageClassifier } from '@mediapipe/tasks-vision';
import { mapVisionPredictions } from './classMapping';
import type { VisionPrediction } from '../types';
import {
  DEFAULT_MODEL_ID,
  MODEL_DESCRIPTORS,
  modelSizeMib,
  type ModelDescriptor,
  type ModelId,
} from './modelConfig';

export interface InferenceResult {
  predictions: VisionPrediction[];
  latencyMs: number;
  modelSizeMb: number;
  model: ModelDescriptor;
}

const classifierPromises = new Map<ModelId, Promise<ImageClassifier>>();

function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function loadModel(modelId: ModelId = DEFAULT_MODEL_ID): Promise<ImageClassifier> {
  let classifierPromise = classifierPromises.get(modelId);
  if (!classifierPromise) {
    const descriptor = MODEL_DESCRIPTORS[modelId];
    classifierPromise = FilesetResolver.forVisionTasks(
      assetPath('mediapipe'),
    ).then((vision) =>
      ImageClassifier.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: assetPath(descriptor.fileName),
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        maxResults: 20,
        scoreThreshold: 0,
      }),
    );
    classifierPromises.set(modelId, classifierPromise);
  }
  return classifierPromise;
}

export async function classifyImage(
  image: HTMLCanvasElement,
  modelId: ModelId = DEFAULT_MODEL_ID,
): Promise<InferenceResult> {
  return classifyImages([image], modelId);
}

export async function classifyImages(
  images: HTMLCanvasElement[],
  modelId: ModelId = DEFAULT_MODEL_ID,
): Promise<InferenceResult> {
  if (images.length === 0) throw new Error('Au moins une vue est requise pour classifier.');
  const descriptor = MODEL_DESCRIPTORS[modelId];
  const classifier = await loadModel(modelId);
  const startedAt = performance.now();
  const predictionsByImage = images.map((image) => {
    const result = classifier.classify(image);
    const categories = result.classifications[0]?.categories ?? [];
    return mapVisionPredictions(
      categories.map((category) => ({
        categoryName: category.categoryName || category.displayName || 'Classe inconnue',
        score: category.score,
      })),
    );
  });
  const latencyMs = performance.now() - startedAt;
  const familyScores = new Map<string, {
    strongest: VisionPrediction;
    fullImageScore: number;
    tileScores: number[];
  }>();

  predictionsByImage.forEach((predictions, imageIndex) => {
    predictions.forEach((prediction) => {
      const key = prediction.family ?? `label:${prediction.originalLabel}`;
      const current = familyScores.get(key);
      if (!current) {
        familyScores.set(key, {
          strongest: prediction,
          fullImageScore: imageIndex === 0 ? prediction.confidence : 0,
          tileScores: imageIndex === 0 ? [] : [prediction.confidence],
        });
        return;
      }
      if (prediction.confidence > current.strongest.confidence) {
        current.strongest = prediction;
      }
      if (imageIndex === 0) {
        current.fullImageScore = Math.max(current.fullImageScore, prediction.confidence);
      } else {
        current.tileScores.push(prediction.confidence);
      }
    });
  });

  const aggregated = [...familyScores.values()].map(({ strongest, fullImageScore, tileScores }) => {
    if (images.length === 1) return { ...strongest, confidence: fullImageScore };
    const bestTileScores = [...tileScores].sort((a, b) => b - a).slice(0, 3);
    const tileAverage = bestTileScores.length
      ? bestTileScores.reduce((total, score) => total + score, 0) / bestTileScores.length
      : 0;
    const tileSupport = tileScores.filter((score) => score >= 0.35).length;
    const supportScore = Math.min(1, tileSupport / 3);
    return {
      ...strongest,
      confidence: 0.5 * fullImageScore + 0.35 * tileAverage + 0.15 * supportScore,
    };
  });

  return {
    predictions: aggregated.sort((a, b) => b.confidence - a.confidence),
    latencyMs,
    modelSizeMb: modelSizeMib(descriptor),
    model: descriptor,
  };
}
