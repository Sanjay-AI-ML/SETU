import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // The AudioWorklet (onset-processor.worklet.js) is loaded via
    // audioWorklet.addModule(), which cannot resolve a relative import
    // inside an inlined data: URL. Force all assets to emit as real
    // files so the worklet is never inlined.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
