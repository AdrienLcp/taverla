import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/*.test.ts', '**/__tests__/**'],
      include: ['apps/server/src/**/*.ts', 'packages/*/src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary']
    },
    projects: [
      'apps/game/vitest.config.ts',
      'apps/server/vitest.config.ts',
      'packages/core/vitest.config.ts',
      'packages/protocol/vitest.config.ts'
    ]
  }
})
