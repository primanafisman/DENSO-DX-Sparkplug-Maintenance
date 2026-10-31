import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { devServerTls } from './scripts/dev-server-config.ts';

export default defineConfig(({ mode, command }) => ({
  plugins: [react(), tailwind()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https:
      command === 'serve'
        ? devServerTls(
            fileURLToPath(new URL('.', import.meta.url)),
            loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'SPM_DEV_'),
          )
        : undefined,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/health': 'http://127.0.0.1:8100',
      '/ready': 'http://127.0.0.1:8100',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    maxWorkers: 2,
  },
  build: { chunkSizeWarningLimit: 700 },
}));
