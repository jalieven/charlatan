/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { i18nProperties } from './plugins/i18nProperties.ts'

// `--mode artifact` produces a single self-contained HTML file (all JS/CSS/assets
// inlined) because the artifact host's CSP blocks any external request.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    i18nProperties(),
    ...(mode === 'artifact' ? [viteSingleFile()] : []),
  ],
  define: {
    // The recorder overlay is opt-in via ?recorder=1, but the artifact build
    // enables it by default: query params don't reach the artifact iframe.
    __RECORDER_DEFAULT__: JSON.stringify(mode === 'artifact'),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    ...(mode === 'artifact' ? { assetsInlineLimit: 100_000_000 } : {}),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
