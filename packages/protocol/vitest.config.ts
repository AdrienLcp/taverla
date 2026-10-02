import { defineConfig } from 'vitest/config'

// The wire contract is pure schema: no browser, no server, no network. Its
// suite runs in plain Node and is the fastest feedback loop in the repo.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts']
  }
})
