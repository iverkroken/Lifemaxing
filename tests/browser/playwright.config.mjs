import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173',
    browserName: process.env.SMOKE_BROWSER || 'chromium',
    trace: 'retain-on-failure',
  },
})
