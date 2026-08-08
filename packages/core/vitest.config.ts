import { defineConfig } from 'vitest/config'

// Pure TypeScript by construction: no browser, no server, no network. This is
// the suite to run in watch mode while writing a rule — see
// `.claude/rules/test-first.md`.
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
