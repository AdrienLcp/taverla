import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hostServerMessageSchema,
  playerServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  FAST_GAME,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  sleep,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/** Long enough that a frozen clip and a running one are unmistakably different. */
const LONG_CLIP = { ...FAST_GAME, playbackDurationMs: 30_000 }

const AWAY_FOR_MS = 400

/** Long enough that losing it would be unmistakable in the elapsed time. */
const PLAYED_FOR_MS = 300

describe('a host who walks away', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const playingRoom = async () => {
    const { code, host } = await harness.openRoom(LONG_CLIP)
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'playing',
      'the clip to start'
    )

    return { code, host, player }
  }

  it('[host-absence] tells the room, and takes the buzzer away', async () => {
    const { host, player } = await playingRoom()

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    expect(playerView(player)?.phase).toBe('playing')
  })

  it('[host-absence] banks the clip where it stopped and spends none of the absence', async () => {
    const { code, host, player } = await playingRoom()

    await sleep(PLAYED_FOR_MS)

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(
      () => hostView(returned)?.isHostConnected === true,
      'the host to reclaim the room'
    )

    const elapsed = hostView(returned)?.roundElapsedMs ?? 0

    // Both halves are load-bearing. The floor proves the seconds the room had
    // already heard were banked rather than thrown away by the resume — drop
    // the freeze and the resume silently restarts the clip from zero. The
    // ceiling proves the absence itself cost the round nothing.
    expect(elapsed).toBeGreaterThanOrEqual(PLAYED_FOR_MS * 0.8)
    expect(elapsed).toBeLessThan(PLAYED_FOR_MS + AWAY_FOR_MS / 2)
  })

  it('[host-absence] gives the countdown back rather than resuming it late', async () => {
    const { code, host } = await harness.openRoom({
      ...LONG_CLIP,
      countdownMs: 400
    })
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'countdown',
      'the countdown to open'
    )

    const firstStart = playerView(player)?.round?.startsAt ?? 0

    host.close()
    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(
      () => (hostView(returned)?.round?.startsAt ?? 0) > firstStart,
      'the countdown to be given back'
    )

    expect(hostView(returned)?.phase).toBe('countdown')
  })

  it('[host-absence] hands the room back to a player who is still there', async () => {
    const { code, host } = await playingRoom()
    const watcher: Peer<unknown> = await harness.connect(
      code,
      playerServerMessageSchema
    )

    host.close()
    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(
      () => hostView(returned)?.phase === 'playing',
      'the round to still be there'
    )

    watcher.close()
  })
})
