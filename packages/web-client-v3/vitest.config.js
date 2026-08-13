import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // The same build-time globals vite.config.js injects, pinned to fixed test values.
  define: {
    __APP_CONFIG__: JSON.stringify({
      userPoolId: 'eu-central-1_TEST',
      clientId: 'test-client-id',
    }),
    __BUILD_HASH__: JSON.stringify('testhash'),
    __MOCK__: JSON.stringify(false),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
