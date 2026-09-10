import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src')
    }
  },
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html']
    },
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts']
  }
})
