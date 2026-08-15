import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type HostServerMessage,
  hostServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  FAST_GAME,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  sessionIdOf,
  sleep,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/** Long enough that a countdown survives a tab closing during it. */
const SLOW_COUNTDOWN = { ...FAST_GAME, countdownMs: 400 }

/** Long enough that a rewound clip and a running one are unmistakably different. */
const PLAYED_FOR_MS = 300

describe('a second console tab on the same room', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  /**
   * A duplicated tab shares the browser's storage, so it replays the same
   * `sessionId` — which is the whole reason the server lets both of them in.
   */
  const openSecondTab = async (code: string, host: Peer<HostServerMessage>) => {
    const duplicate = await harness.connect(code, hostServerMessageSchema)

    duplicate.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => hostView(duplicate) !== null,
      'the second tab to be seated'
    )

    return duplicate
  }

  it('[second-console] leaves the round on the clock when one of the two closes', async () => {
    const { code, host } = await harness.openRoom(SLOW_COUNTDOWN)
    const player = await harness.seat({ code, nickname: 'Zoe' })
    const duplicate = await openSecondTab(code, host)

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'countdown',
      'the countdown to open'
    )

    duplicate.close()

    await waitFor(
      () => playerView(player)?.phase === 'playing',
      'the clip to start anyway'
    )
  })

  it('[second-console] does not rewind a clip it arrives in the middle of', async () => {
    const { code, host } = await harness.openRoom()
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'playing',
      'the clip to start'
    )

    await sleep(PLAYED_FOR_MS)

    const duplicate = await openSecondTab(code, host)

    expect(hostView(duplicate)?.roundElapsedMs ?? 0).toBeGreaterThanOrEqual(
      PLAYED_FOR_MS * 0.8
    )
  })

  it('[second-console] does not restart a countdown it arrives during', async () => {
    const { code, host } = await harness.openRoom(SLOW_COUNTDOWN)
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'countdown',
      'the countdown to open'
    )

    const startsAt = playerView(player)?.round?.startsAt ?? 0
    const framesBefore = player.frames.length

    await openSecondTab(code, host)
    await waitFor(
      () => player.frames.length > framesBefore,
      'the room to hear the second tab'
    )

    expect(playerView(player)?.round?.startsAt).toBe(startsAt)
  })
})
