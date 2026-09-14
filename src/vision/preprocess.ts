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
  const bitmap = await createImageBitmap(file);
  if (bitmap.width < 32 || bitmap.height < 32) {
    bitmap.close();
    throw new Error('L’image est trop petite pour être analysée (minimum 32 × 32 px).');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const originX = (bitmap.width - side) / 2;
  const originY = (bitmap.height - side) / 2;
  const render = (sourceX: number, sourceY: number, sourceSize: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = MODEL_INPUT_SIZE;
    canvas.height = MODEL_INPUT_SIZE;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Le navigateur ne permet pas de préparer cette image.');
    }
    context.fillStyle = '#f4f0e7';
    context.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
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
    const sourceX = Math.min(
      originX + side - tileSize,
      Math.max(originX, originX + side * column - tileSize / 2),
    );
    const sourceY = Math.min(
      originY + side - tileSize,
      Math.max(originY, originY + side * row - tileSize / 2),
    );
    canvases.push(render(sourceX, sourceY, tileSize));
  }));
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  return { canvas, canvases, ...dimensions };
}
