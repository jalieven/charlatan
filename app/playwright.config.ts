import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:5178',
    viewport: { width: 390, height: 780 },
    hasTouch: true,
    launchOptions: {
      // Pre-installed Chromium; the pinned @playwright/test version may not
      // match the browsers folder, so point at the binary directly.
      executablePath: '/opt/pw-browsers/chromium',
    },
  },
  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://localhost:5178',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
