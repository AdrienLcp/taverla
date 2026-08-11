import { defineConfig, devices } from '@playwright/test'

/**
 * Its own ports, never the dev stack's: an end-to-end run must not borrow a
 * server someone left running against the real catalogue, and it must not take
 * the ports of one they are still using.
 */
const APP_PORT = 5274
const SERVER_PORT = 3101
const CATALOGUE_PORT = 3199

// `127.0.0.1`, not `localhost`: the Node server binds IPv4 only, and the
// readiness probe resolves `localhost` to `::1` first and never falls back.
const APP_URL = `http://127.0.0.1:${APP_PORT}`
const CATALOGUE_URL = `http://127.0.0.1:${CATALOGUE_PORT}`
const SERVER_URL = `http://127.0.0.1:${SERVER_PORT}`

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  projects: [
    {
      name: 'chromium',
      // Pinned: the locators read accessible names, and those are translated.
      use: { ...devices['Desktop Chrome'], locale: 'en-US' }
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
      // `start`, not `dev`: nothing here edits server code, and the watcher
      // `dev` wraps it in never comes up when Playwright spawns it detached.
      command: 'pnpm --filter @taverla/server start',
      env: {
        ALLOWED_ORIGINS: APP_URL,
        DEEZER_API_URL: CATALOGUE_URL,
        PORT: String(SERVER_PORT)
      },
      reuseExistingServer: false,
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
