import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read, never retyped: About prints this and a test asserts what About prints, so a literal
// here would agree with a stale value forever.
const appVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Supplied by the VitePWA plugin at build time, absent under vitest.
      'virtual:pwa-register/react': path.resolve(__dirname, './src/test/pwa-register-stub.js'),
    },
  },
  // The same build-time globals vite.config.js injects, pinned to fixed test values.
  define: {
    __APP_CONFIG__: JSON.stringify({
      userPoolId: 'eu-central-1_TEST',
      clientId: 'test-client-id',
    }),
    __BUILD_HASH__: JSON.stringify('testhash'),
    __APP_VERSION__: JSON.stringify(appVersion),
    __MOCK__: JSON.stringify(false),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
