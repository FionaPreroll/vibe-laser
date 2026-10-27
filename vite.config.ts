import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative asset URLs, so the build runs under any path, such as GitHub Pages' /vibe-laser/.
  base: './',
  plugins: [preact()],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Every source file, so files without tests count as uncovered instead of missing.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.ts'],
      // lcov for Codecov, a table for the terminal.
      reporter: ['text', 'lcov'],
    },
  },
})
