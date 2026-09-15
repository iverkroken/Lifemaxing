import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'atelier.spec.js',
  outputDir: '../../artifacts/atelier/test-results',
  workers: 2,
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5176', trace: 'retain-on-failure' },
  projects: ['chromium', 'firefox'].map((browserName) => ({
    name: browserName,
    use: { browserName }
  }))
})
