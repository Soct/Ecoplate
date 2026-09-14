export const MODEL_IDS = ['food101-finetuned', 'imagenet-baseline'] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export interface ModelDescriptor {
  id: ModelId;
  label: string;
  shortLabel: string;
  fileName: string;
  dataset: string;
  outputLabels: number;
  sizeBytes: number;
  sha256: string;
  mapping: 'direct-family' | 'imagenet-to-family';
}

export const MODEL_DESCRIPTORS: Record<ModelId, ModelDescriptor> = {
  'food101-finetuned': {
    id: 'food101-finetuned',
    label: 'EfficientNet-Lite0 fine-tuné sur Food-101 (8 familles)',
    shortLabel: 'Food-101 fine-tuné',
    fileName: 'models/efficientnet_lite0_food101_8_int8.tflite',
    dataset: 'Food-101 relabellisé',
    outputLabels: 8,
    sizeBytes: 4_140_006,
    sha256: '5b7d5e3ea72564157a5763c78bdf8536cf25805f15bfc5a284eb1d3c84d4c2ae',
    mapping: 'direct-family',
  },
  'imagenet-baseline': {
    id: 'imagenet-baseline',
    label: 'EfficientNet-Lite0 original ImageNet (1 000 classes)',
    shortLabel: 'ImageNet original',
    fileName: 'models/efficientnet_lite0_imagenet_int8.tflite',
    dataset: 'ImageNet',
    outputLabels: 1_000,
    sizeBytes: 5_434_517,
    sha256: 'bc2ffe19c1118de0c0c2a9088992da5589722656e0fba81421385300a4a34b16',
    mapping: 'imagenet-to-family',
  },
};

export const DEFAULT_MODEL_ID: ModelId = 'food101-finetuned';

export function modelSizeMib(descriptor: ModelDescriptor): number {
  return descriptor.sizeBytes / 1024 / 1024;
}
