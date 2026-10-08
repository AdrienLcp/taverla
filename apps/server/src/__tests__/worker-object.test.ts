import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unstable_startWorker } from 'wrangler'

import { DEFAULT_BUZZER_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import { hostServerMessageSchema } from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  harnessAt,
  hostView,
  playerView,
  type RoomHarness,
  sessionIdOf,
  waitFor
} from './room-harness'

/**
 * The other suites drive the room engine in Node, which is the same code the
 * Durable Object runs. This one drives the object itself under the Workers
 * runtime: the socket attachments, the storage and the alarm, which no Node
 * process has. Restarting the runtime is a harder eviction than hibernation —
 * the sockets go too — so a room that survives it survives either.
 */

const BUZZER_GAME: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: DEFAULT_BUZZER_SETTINGS,
  mode: DEFAULT_MODE_SETTINGS.buzzer,
  roundCount: null
}

/** Long enough to tear the runtime down and bring it back inside it. */
const COUNTDOWN_OUTLIVING_A_RESTART_MS = 4_000

/**
 * No console is attached between the restart and the host's return, and a
 * round's clock is frozen while none is — so the countdown resumes with most of
 * itself still to run.
 */
const COUNTDOWN_RESUMED_WITHIN_MS = COUNTDOWN_OUTLIVING_A_RESTART_MS + 4_000

const RUNTIME_BOOT_MS = 60_000

const SERVER_ROOT = resolve(import.meta.dirname, '../..')

// The deployed config without its static assets: `wrangler.jsonc` points them
// at the game's build, which a test run must not depend on.
const testConfig = ({
  main,
  noBundle
}: {
  main: string
  noBundle: boolean
}) => ({
  compatibility_date: '2026-09-01',
  compatibility_flags: ['nodejs_compat'],
  durable_objects: {
    bindings: [
      { class_name: 'RoomObject', name: 'ROOMS' },
      { class_name: 'WallPairingObject', name: 'WALL_PAIRINGS' }
    ]
  },
  main,
  migrations: [
    {
      new_sqlite_classes: ['RoomObject', 'WallPairingObject'],
      tag: 'v1'
    }
  ],
  name: 'taverla-test',
  no_bundle: noBundle,
  ratelimits: [
    {
      name: 'ROOM_CREATION_LIMITER',
      namespace_id: '1001',
      simple: { limit: 1000, period: 60 }
    }
  ]
})

const writeConfig = (path: string, config: ReturnType<typeof testConfig>) => {
  writeFileSync(path, JSON.stringify(config))

  return path
}

/**
 * Bundled once, while the file is collected and no timeout runs: left to
 * `unstable_startWorker`, every start bundles the worker again and its first
 * request waits on that, which a loaded machine stretched past the test's
 * minute. A restart then only starts the runtime again.
 */
const bundleWorker = (directory: string): string => {
  const sourceConfig = writeConfig(
    join(directory, 'wrangler.source.json'),
    testConfig({ main: join(SERVER_ROOT, 'src/worker.ts'), noBundle: false })
  )
  const outdir = join(directory, 'bundle')

  execFileSync(
    process.execPath,
    [
      join(SERVER_ROOT, 'node_modules/wrangler/bin/wrangler.js'),
      'deploy',
      '--dry-run',
      '--config',
      sourceConfig,
      '--outdir',
      outdir
    ],
    { cwd: SERVER_ROOT, stdio: 'ignore' }
  )

  return writeConfig(
    join(directory, 'wrangler.json'),
    testConfig({ main: join(outdir, 'worker.js'), noBundle: true })
  )
}

const stateDirectory = mkdtempSync(join(tmpdir(), 'taverla-worker-'))
const configPath = bundleWorker(stateDirectory)

const startRuntime = async () => {
  const worker = await unstable_startWorker({
    config: configPath,
    dev: {
      inspector: false,
      persist: join(stateDirectory, 'state'),
      server: { hostname: '127.0.0.1', port: 0 }
    }
  })
  const url = await worker.url

  return harnessAt({
    origin: url.host,
    shutDown: () => worker.dispose()
  })
}

let runtime: RoomHarness

beforeAll(async () => {
  runtime = await startRuntime()
}, RUNTIME_BOOT_MS)

afterAll(async () => {
  await runtime.stop()
  rmSync(stateDirectory, { force: true, recursive: true })
})

const restartRuntime = async () => {
  await runtime.stop()
  runtime = await startRuntime()
}

const reconnectHost = async ({
  code,
  hostToken
}: {
  code: string
  hostToken: string
}) => {
  const host = await runtime.connect(code, hostServerMessageSchema)

  host.send({
    hostToken,
    protocolVersion: PROTOCOL_VERSION,
    role: 'host',
    type: 'hello'
  })
  await waitFor(() => hostView(host) !== null, 'the host to be back')

  return host
}

describe('the room object', () => {
  it(
    '[worker] keeps the room, its seats and their scores across a restart',
    async () => {
      const { code, host, hostToken } = await runtime.openRoom(BUZZER_GAME)
      const alice = await runtime.seat({ code, nickname: 'Alice' })
      const aliceSession = sessionIdOf(alice)

      host.send({ type: 'host.startRound' })
      await waitFor(
        () => hostView(host)?.phase === 'playing',
        'the round to open'
      )

      const roundId = hostView(host)?.round?.id ?? ''

      alice.send({ roundId, type: 'player.buzz' })
      await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

      const aliceId = playerView(alice)?.youId ?? ''

      host.send({
        playerId: aliceId,
        roundId,
        type: 'host.judge',
        verdict: { isCorrect: true, kind: 'single' }
      })
      await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

      await restartRuntime()

      const hostAgain = await reconnectHost({ code, hostToken })
      const aliceAgain = await runtime.seat({
        code,
        nickname: 'Alice',
        sessionId: aliceSession
      })

      expect(hostView(hostAgain)?.phase).toBe('revealed')
      expect(playerView(aliceAgain)?.youId).toBe(aliceId)
      expect(
        hostView(hostAgain)?.players.find(({ id }) => id === aliceId)?.score
      ).toBe(1)
    },
    RUNTIME_BOOT_MS
  )

  it(
    '[worker] fires a deadline set before a restart once the room is back',
    async () => {
      const { code, host, hostToken } = await runtime.openRoom({
        ...BUZZER_GAME,
        countdownMs: COUNTDOWN_OUTLIVING_A_RESTART_MS
      })

      await runtime.seat({ code, nickname: 'Alice' })
      host.send({ type: 'host.startRound' })
      await waitFor(
        () => hostView(host)?.phase === 'countdown',
        'the countdown'
      )

      await restartRuntime()

      const hostAgain = await reconnectHost({ code, hostToken })

      expect(hostView(hostAgain)?.phase).toBe('countdown')
      await waitFor(
        () => hostView(hostAgain)?.phase === 'playing',
        'the countdown to run out',
        COUNTDOWN_RESUMED_WITHIN_MS
      )
    },
    RUNTIME_BOOT_MS
  )
})
