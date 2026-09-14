import { validateImageFile } from '../vision/preprocess';

type FileHandler = (file: File) => void;

export class ImageInput {
  private objectUrl: string | null = null;

  constructor(
    private readonly input: HTMLInputElement,
    private readonly dropZone: HTMLElement,
    private readonly preview: HTMLImageElement,
    private readonly onFile: FileHandler,
    private readonly onError: (message: string) => void,
  ) {
    this.input.addEventListener('change', () => {
      const file = this.input.files?.[0];
      if (file) this.accept(file);
    });
    this.dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dropZone.classList.add('is-dragging');
    });
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('is-dragging');
    });
    this.dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dropZone.classList.remove('is-dragging');
      const file = event.dataTransfer?.files[0];
      if (file) this.accept(file);
    });
  }

  private accept(file: File): void {
    try {
      validateImageFile(file);
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(file);
      this.preview.src = this.objectUrl;
      this.preview.alt = `Aperçu local de ${file.name}`;
      this.preview.hidden = false;
      this.dropZone.classList.add('has-image');
      this.onFile(file);
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'Image non exploitable.');
    }
  }
}
