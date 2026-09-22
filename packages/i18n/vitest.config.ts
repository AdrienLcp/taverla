import { defineConfig } from 'vitest/config'

// Pure TypeScript by construction: no browser, no server, no network. The one
// module a test imports late is a dictionary, so that a lazily loaded locale is
// proved across a real module boundary. The whole suite runs in well under a
// second.
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
