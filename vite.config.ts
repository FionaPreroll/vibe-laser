import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative asset URLs, so the build runs under any path, such as GitHub Pages' /vibe-laser/.
  base: './',
  plugins: [preact()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
