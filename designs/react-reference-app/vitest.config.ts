import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Must mirror vite.config.ts: this config replaces it for test runs, and
    // tsconfig's paths would otherwise bless an import vitest cannot resolve.
    alias: {
      '@content': path.resolve(__dirname, '../../packages/content/src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
