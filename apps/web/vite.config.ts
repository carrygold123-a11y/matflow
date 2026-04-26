import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@matflow/shared-types': resolve(__dirname, '../../shared/types/src'),
      '@matflow/shared-utils': resolve(__dirname, '../../shared/utils/src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['dist/**'],
  },
});
