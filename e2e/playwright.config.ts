import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { defineConfig, devices } from '@playwright/test'

/**
 * Its own ports, never the dev stack's: an end-to-end run must not borrow a
 * server someone left running against the real catalogue, and it must not take
 * the ports of one they are still using.
 */
const APP_PORT = 5274
const SERVER_PORT = 3101
const CATALOGUE_PORT = 3199

// `127.0.0.1`, not `localhost`: the Worker is bound to IPv4 only, and the
// readiness probe resolves `localhost` to `::1` first and never falls back.
const APP_URL = `http://127.0.0.1:${APP_PORT}`
const CATALOGUE_URL = `http://127.0.0.1:${CATALOGUE_PORT}`
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`

const WORKER_STATE = mkdtempSync(join(tmpdir(), 'taverla-e2e-'))

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  // Explicit, or a run started from the repository root drops `test-results/`
  // there rather than beside the specs — which is the one thing moving this
  // config into `e2e/` was for.
  outputDir: './test-results',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The room plays a clip at a stored volume defaulting to 80%, and a run
        // started headed would play it out loud. Muted at the process rather
        // than through the store, so no journey can forget.
        launchOptions: { args: ['--mute-audio'] },
        // Pinned: the locators read accessible names, and those are translated.
        locale: 'en-US'
      }
    }
  ],
  reporter: 'list',
  testDir: '.',
  timeout: 60_000,
  use: { baseURL: APP_URL, trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'pnpm exec tsx support/deezer-stub.ts',
      env: { DEEZER_STUB_PORT: String(CATALOGUE_PORT) },
      reuseExistingServer: false,
      url: `${CATALOGUE_URL}/chart/0/tracks`
    },
    {
      // The Worker under the Workers runtime, so every journey crosses the
      // Durable Object the deployed room lives in. A state directory of the
      // run's own, or a room from the last run would still hold its code.
      command: [
        'pnpm --filter @taverla/server exec wrangler dev',
        `--ip 127.0.0.1 --port ${SERVER_PORT}`,
        `--persist-to ${WORKER_STATE}`,
        `--var ALLOWED_ORIGINS:${APP_URL}`,
        `--var DEEZER_API_URL:${CATALOGUE_URL}`
      ].join(' '),
      reuseExistingServer: false,
      timeout: 120_000,
      // Any room code answers `{ exists: false }`, which is all a probe needs.
      url: `${SERVER_URL}/api/rooms/AAAA`
    },
    {
      command: 'pnpm --filter @taverla/game dev',
      env: {
        VITE_DEV_PORT: String(APP_PORT),
        VITE_SERVER_ORIGIN: SERVER_URL
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: APP_URL
    }
  ],
  // One server process holds every room, and one journey asserts that a given
  // code is held by nobody. Two of them at once could invent exactly that code.
  workers: 1
})
