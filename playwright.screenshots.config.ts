import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// The README's screenshots: `pnpm screenshots` writes them to docs/screenshots/.
export default defineConfig({
  ...base,
  testDir: 'tests/screenshots',
  outputDir: 'test-results/screenshots',
  reporter: 'list',
  snapshotPathTemplate: 'docs/screenshots/{arg}{ext}',
  // Write a picture again only where the page differs from it.
  updateSnapshots: 'changed',
})
