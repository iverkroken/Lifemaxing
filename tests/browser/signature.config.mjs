import { defineConfig } from '@playwright/test'

// Isolated presentation entry; no authentication, API or database prerequisites.
export default defineConfig({
  testDir: '.',
  testMatch: 'signature.spec.js',
  outputDir: '../../artifacts/p1/test-results',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }],
})
