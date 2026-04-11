import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  css: {
    // postcss.config.mjs uses string-form plugin names ('@tailwindcss/postcss')
    // which Vite's PostCSS loader rejects when it reads the config during test
    // runs. Overriding with an empty inline config prevents Vite from picking
    // up the project postcss.config at all. CSS processing is irrelevant to
    // unit tests so this has no practical effect on either tests or builds.
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
