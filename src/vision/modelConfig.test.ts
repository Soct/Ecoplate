import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODEL_DESCRIPTORS } from './modelConfig';

describe('identité des modèles distribués', () => {
  it.each(Object.values(MODEL_DESCRIPTORS))(
    'vérifie la taille et le SHA-256 de $shortLabel',
    (descriptor) => {
      const path = `public/${descriptor.fileName}`;
      expect(statSync(path).size).toBe(descriptor.sizeBytes);
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(
        descriptor.sha256,
      );
    },
  );
});
