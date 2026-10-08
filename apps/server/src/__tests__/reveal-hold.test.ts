import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoomSettings } from '@taverla/protocol/room'
import { hostServerMessageSchema } from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { nowMs } from '@/infrastructure/clock'

import { startRoomHarness } from './node-room-harness'
import {
  FAST_GAME,
  halves,
  hostView,
  playerView,
  type RoomHarness,
  sessionIdOf,
  sleep,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const WON_IT = halves(true, true)

/** The shortest hold the settings allow, so no suite waits out a real one. */
const HOLD_MS = 2_000

const HELD_REVEAL: RoomSettings = { ...FAST_GAME, autoAdvanceMs: HOLD_MS }

/** Long enough that a fresh hold and the remains of one cannot be confused. */
const AWAY_FOR_MS = 400

describe('the wait between a reveal and the round after it', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const revealedRoom = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to start'
    )

    const roundId = hostView(host)?.round?.id ?? ''

    player.send({ roundId, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz to land')

    host.send({
      playerId: playerView(player)?.youId ?? '',
      roundId,
      type: 'host.judge',
      verdict: WON_IT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    return { code, host, player }
  }

  it('[reveal-hold] gives both screens the deadline, not what is left of it', async () => {
    const { host, player } = await revealedRoom(HELD_REVEAL)

    const onTheConsole = hostView(host)?.round?.advancesAt ?? 0

    // The same number on both, which is what makes it the room's wait rather
    // than each device's: a duration would already have aged differently by the
    // time the two frames were read.
    expect(onTheConsole).toBe(playerView(player)?.round?.advancesAt)
    expect(onTheConsole - nowMs()).toBeGreaterThan(HOLD_MS / 2)
    expect(onTheConsole - nowMs()).toBeLessThanOrEqual(HOLD_MS)
  })

  it('[reveal-hold] says nothing at all when the host advances by hand', async () => {
    const { host, player } = await revealedRoom(FAST_GAME)

    expect(hostView(host)?.round?.advancesAt).toBeNull()
    expect(playerView(player)?.round?.advancesAt).toBeNull()
  })

  it('[reveal-hold] takes the deadline off the wire while the host is away', async () => {
    const { host, player } = await revealedRoom(HELD_REVEAL)

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    // The server cancelled the timer on the way out, so a deadline left standing
    // would have every player's screen drain a bar against nothing.
    expect(playerView(player)?.round?.advancesAt).toBeNull()
  })

  it('[reveal-hold] starts the wait over when the host comes back', async () => {
    const { code, host, player } = await revealedRoom(HELD_REVEAL)

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
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => hostView(returned)?.round?.advancesAt != null,
      'the wait to start again'
    )

    // A whole hold rather than the remains of one, which is the single place
    // this parts company with the round clock beside it: the reveal is reading
    // time, and a room watching a console that had gone read none of it.
    expect(
      (hostView(returned)?.round?.advancesAt ?? 0) - nowMs()
    ).toBeGreaterThan(HOLD_MS - AWAY_FOR_MS / 2)
  })

  it('[reveal-hold] moves the deadline when the host lengthens it mid-reveal', async () => {
    const { host, player } = await revealedRoom(HELD_REVEAL)
    const before = playerView(player)?.round?.advancesAt ?? 0

    host.send({
      settings: { ...HELD_REVEAL, autoAdvanceMs: 25_000 },
      type: 'host.updateSettings'
    })
    await waitFor(
      () => (playerView(player)?.round?.advancesAt ?? 0) > before,
      'the wait to grow'
    )

    // `revealed` is outside `isRoundInPlay`, so this is the one setting a host
    // can change while the thing it governs is on screen — and the number they
    // just picked is the wait they expect to watch, counted from the change.
    expect(
      (playerView(player)?.round?.advancesAt ?? 0) - nowMs()
    ).toBeGreaterThan(20_000)
  })
})
