export const MODEL_INPUT_SIZE = 224;
export const MAX_FILE_SIZE = 12 * 1024 * 1024;

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  canvases: HTMLCanvasElement[];
  width: number;
  height: number;
}

export function validateImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier sélectionné n’est pas une image reconnue.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('L’image dépasse 12 Mo. Choisissez une image plus légère.');
  }
}

export async function preprocessImage(file: File): Promise<PreparedImage> {
  validateImageFile(file);
  const bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' });
  if (bitmap.width < 32 || bitmap.height < 32) {
    bitmap.close();
    throw new Error('L’image est trop petite pour être analysée (minimum 32 × 32 px).');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const originX = Math.floor((bitmap.width - side) / 2);
  const originY = Math.floor((bitmap.height - side) / 2);
  const render = (sourceX: number, sourceY: number, sourceSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = MODEL_INPUT_SIZE;
    canvas.height = MODEL_INPUT_SIZE;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Le navigateur ne permet pas de préparer cette image.');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      Math.round(sourceX),
      Math.round(sourceY),
      Math.max(1, Math.round(sourceSize)),
      Math.max(1, Math.round(sourceSize)),
      0,
      0,
      MODEL_INPUT_SIZE,
      MODEL_INPUT_SIZE,
    );
    return canvas;
  };

  const canvas = render(originX, originY, side);
  const canvases = [canvas];
  const tileSize = side / 3 * 1.15;
  const centers = [1 / 6, 1 / 2, 5 / 6];
  centers.forEach((row) => centers.forEach((column) => {
    const sourceSize = Math.max(1, Math.round(tileSize));
    const sourceX = Math.min(
      originX + side - sourceSize,
      Math.max(originX, originX + side * column - sourceSize / 2),
    );
    const sourceY = Math.min(
      originY + side - sourceSize,
      Math.max(originY, originY + side * row - sourceSize / 2),
    );
    canvases.push(render(sourceX, sourceY, sourceSize));
  }));
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  return { canvas, canvases, ...dimensions };
}
