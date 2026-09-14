import { AutoProcessor, RawImage, SamModel } from '@huggingface/transformers';

const SAM_MODEL_ID = 'Xenova/slimsam-77-uniform';
type SamProcessor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> & {
  post_process_masks: (...args: any[]) => Promise<any[]>;
};
export type SegmentationPoint = { x: number; y: number };

export interface SegmentationResult {
  canvases: HTMLCanvasElement[];
  latencyMs: number;
  modelLabel: string;
}

let modelPromise: Promise<SamModel> | null = null;
let processorPromise: Promise<SamProcessor> | null = null;

function loadSam(): Promise<[SamModel, SamProcessor]> {
  modelPromise ??= SamModel.from_pretrained(SAM_MODEL_ID, { dtype: 'q8' }) as Promise<SamModel>;
  processorPromise ??= AutoProcessor.from_pretrained(SAM_MODEL_ID) as Promise<SamProcessor>;
  return Promise.all([modelPromise, processorPromise]);
}

function makeMaskedCrop(
  bitmap: ImageBitmap,
  mask: Uint8Array,
  maskWidth: number,
  maskHeight: number,
): HTMLCanvasElement {
  const source = document.createElement('canvas');
  source.width = bitmap.width;
  source.height = bitmap.height;
  const sourceContext = source.getContext('2d', { alpha: false });
  if (!sourceContext) throw new Error('Le navigateur ne permet pas de lire cette image.');
  sourceContext.drawImage(bitmap, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, bitmap.width, bitmap.height);

  let minX = bitmap.width;
  let minY = bitmap.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bitmap.height; y += 1) {
    for (let x = 0; x < bitmap.width; x += 1) {
      const maskX = Math.min(maskWidth - 1, Math.floor(x * maskWidth / bitmap.width));
      const maskY = Math.min(maskHeight - 1, Math.floor(y * maskHeight / bitmap.height));
      if ((mask[maskY * maskWidth + maskX] ?? 0) > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('SlimSAM n’a pas trouvé de zone à isoler.');

  const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.08);
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(bitmap.width - 1, maxX + padding);
  maxY = Math.min(bitmap.height - 1, maxY + padding);
  const size = Math.max(maxX - minX + 1, maxY - minY + 1);
  const masked = document.createElement('canvas');
  masked.width = size;
  masked.height = size;
  const maskedContext = masked.getContext('2d', { alpha: false });
  if (!maskedContext) throw new Error('Le navigateur ne permet pas de préparer le masque.');
  maskedContext.fillStyle = '#f4f0e7';
  maskedContext.fillRect(0, 0, size, size);
  const output = maskedContext.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(bitmap.width - 1, minX + x);
      const sourceY = Math.min(bitmap.height - 1, minY + y);
      const maskX = Math.min(maskWidth - 1, Math.floor(sourceX * maskWidth / bitmap.width));
      const maskY = Math.min(maskHeight - 1, Math.floor(sourceY * maskHeight / bitmap.height));
      const targetIndex = (y * size + x) * 4;
      if ((mask[maskY * maskWidth + maskX] ?? 0) > 0) {
        const sourceIndex = (sourceY * bitmap.width + sourceX) * 4;
        output.data[targetIndex] = pixels.data[sourceIndex] ?? 244;
        output.data[targetIndex + 1] = pixels.data[sourceIndex + 1] ?? 240;
        output.data[targetIndex + 2] = pixels.data[sourceIndex + 2] ?? 231;
      } else {
        output.data[targetIndex] = 244;
        output.data[targetIndex + 1] = 240;
        output.data[targetIndex + 2] = 231;
      }
      output.data[targetIndex + 3] = 255;
    }
  }
  maskedContext.putImageData(output, 0, 0);
  const result = document.createElement('canvas');
  result.width = 224;
  result.height = 224;
  result.getContext('2d')?.drawImage(masked, 0, 0, size, size, 0, 0, 224, 224);
  return result;
}

export async function segmentImage(file: File, point: SegmentationPoint): Promise<SegmentationResult> {
  const startedAt = performance.now();
  const [model, processor] = await loadSam();
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await RawImage.read(imageUrl);
    const inputs = await processor(image, { input_points: [[[point.x, point.y]]] });
    const outputs = await model(inputs);
    const masks = await processor.post_process_masks(
      outputs.pred_masks,
      inputs.original_sizes,
      inputs.reshaped_input_sizes,
    );
    const maskTensor = masks[0];
    const scores = outputs.iou_scores.data as Float32Array;
    const channelCount = maskTensor.dims[1] ?? 1;
    const height = maskTensor.dims[2] ?? 0;
    const width = maskTensor.dims[3] ?? 0;
    let bestChannel = 0;
    for (let channel = 1; channel < channelCount; channel += 1) {
      if ((scores[channel] ?? -Infinity) > (scores[bestChannel] ?? -Infinity)) bestChannel = channel;
    }
    const channelSize = width * height;
    const maskData = new Uint8Array(maskTensor.data as ArrayLike<number>).slice(
      bestChannel * channelSize,
      (bestChannel + 1) * channelSize,
    ) as Uint8Array;
    const bitmap = await createImageBitmap(file);
    const canvas = makeMaskedCrop(bitmap, maskData, width, height);
    bitmap.close();
    return {
      canvases: [canvas],
      latencyMs: performance.now() - startedAt,
      modelLabel: 'SlimSAM quantifié + EfficientNet',
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
