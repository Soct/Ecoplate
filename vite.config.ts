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
  },
});
