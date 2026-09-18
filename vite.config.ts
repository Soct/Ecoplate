import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    watch: {
      ignored: ['**/dataset/**', '**/.venv/**'],
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        portfolio: resolve(__dirname, 'index.html'),
        ecoplate: resolve(__dirname, 'ecoplate.html'),
      },
    },
  },
});
