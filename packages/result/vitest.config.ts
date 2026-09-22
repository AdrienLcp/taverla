import { defineConfig } from 'vitest/config'

// Pure TypeScript by construction: no browser, no server, no network.
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html']
    },
    include: ['src/**/*.test.ts']
  }
})
