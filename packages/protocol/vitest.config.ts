import { defineConfig } from 'vitest/config'

// The wire contract is pure schema: no browser, no server, no network. Its
// suite runs in plain Node and is the fastest feedback loop in the repo.
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
