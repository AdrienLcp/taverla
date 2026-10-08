import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_REFLEX_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

import { FALSE_START_FLOOR_MS } from '@taverla/core/reflex/reaction'

import { nowMs } from '@/infrastructure/clock'

import { startRoomHarness } from './node-room-harness'
import {
  errorsIn,
  hostView,
  playerView,
  type RoomHarness,
  reflexRound,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/**
 * A heat lasting two to six seconds is the game; it is also eight suites' worth
 * of waiting. The draw and the window are pinned to the same shape a hundred
 * times smaller — the floor is not, because it is the rule under test.
 */
const timings = vi.hoisted(() => ({ flipDelayMs: 60, tapWindowMs: 800 }))

vi.mock('@taverla/core/reflex/flip-schedule', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@taverla/core/reflex/flip-schedule')
  >()),
  drawFlipDelayMs: () => timings.flipDelayMs,
  reflexRoundDurationMs: () => timings.flipDelayMs + timings.tapWindowMs
}))

/**
 * Not on the shelf yet, so the door cannot open a room for it and the harness
 * sends `host.updateSettings` instead — which is the whole of how a game served
 * without screens is reached.
 */
const REFLEX_GAME: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: DEFAULT_REFLEX_SETTINGS,
  mode: DEFAULT_MODE_SETTINGS.buzzer,
  roundCount: null
}

let room: RoomHarness

beforeEach(async () => {
  room = await startRoomHarness()
})

afterEach(async () => {
  await room.stop()
})

const openPlayingRound = async (settings: RoomSettings = REFLEX_GAME) => {
  const { code, host } = await room.openRoom(settings)
  const alice = await room.seat({ code, nickname: 'Alice' })
  const bob = await room.seat({ code, nickname: 'Bob' })

  host.send({ type: 'host.startRound' })
  await waitFor(() => hostView(host)?.phase === 'playing', 'the heat to open')

  const round = hostView(host)?.round

  if (round == null) {
    throw new Error('The heat vanished as it opened')
  }

  return {
    alice,
    aliceId: playerView(alice)?.youId ?? '',
    bob,
    bobId: playerView(bob)?.youId ?? '',
    code,
    host,
    round
  }
}

/** Sleeps until a press would land on the honest side of the false-start floor. */
const untilTheFlipIsFair = async (
  host: Awaited<ReturnType<RoomHarness['openRoom']>>['host']
): Promise<void> => {
  const flipsAt = reflexRound(hostView(host))?.flipsAt

  if (flipsAt == null) {
    throw new Error('The heat has no flip')
  }

  await new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.max(0, flipsAt + FALSE_START_FLOOR_MS + 10 - nowMs())
    )
  )
}

const scoreOf = (
  host: Awaited<ReturnType<RoomHarness['openRoom']>>['host'],
  nickname: string
) =>
  hostView(host)?.players.find((player) => player.nickname === nickname)?.score

describe('a heat nobody has to judge', () => {
  // The whole claim of this game: no catalogue, no question, and the only thing
  // the server brings to the round is when the screen changes.
  it('[reflex] opens a heat on a wait and nothing else', async () => {
    const { host } = await openPlayingRound()
    const view = hostView(host)

    expect(view?.currentContent).toEqual({ kind: 'reflex' })
    expect(reflexRound(view)?.presses).toEqual([])
    expect(view?.remainingPoolSize).toBe(0)
  })

  // The fifth guarantee, seen from the wire: the flip is a server moment every
  // device schedules against, not a frame that arrives when the Wi-Fi allows.
  it('[reflex] gives every screen the same moment to flip on', async () => {
    const { alice, host } = await openPlayingRound()
    const flipsAt = reflexRound(hostView(host))?.flipsAt

    expect(flipsAt).toBe(reflexRound(playerView(alice))?.flipsAt)
    expect(flipsAt).toBe(
      (hostView(host)?.round?.startsAt ?? 0) + timings.flipDelayMs
    )
  })

  it('[reflex] pays the first player, and nobody else', async () => {
    const { alice, bob, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(
      () => (reflexRound(hostView(host))?.presses.length ?? 0) === 1,
      "Alice's press"
    )
    bob.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    expect(scoreOf(host, 'Alice')).toBe(1)
    expect(scoreOf(host, 'Bob')).toBe(0)
    expect(hostView(host)?.round?.awards).toHaveLength(1)
  })

  // Being first *is* being right, so nothing on this path asks a host anything —
  // it is the one game on the shelf that mints its own verdict.
  it('[reflex] settles with a verdict nobody was asked for', async () => {
    const { alice, aliceId, bob, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    bob.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    expect(hostView(host)?.round?.awards[0]).toEqual({
      playerId: aliceId,
      points: 1,
      speedBonus: 0,
      verdict: { isCorrect: true, kind: 'single' }
    })
  })

  it('[reflex] records every press in the order the server heard them', async () => {
    const { alice, aliceId, bob, bobId, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(
      () => (reflexRound(hostView(host))?.presses.length ?? 0) === 1,
      "Alice's press"
    )
    bob.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    expect(
      reflexRound(hostView(host))?.presses.map((press) => press.playerId)
    ).toEqual([aliceId, bobId])
  })

  // Nobody holds the floor in this game, so the phase a buzz would move the room
  // into is one it never reaches — and `applyVerdict` is not on the path at all.
  it('[reflex] never takes a floor', async () => {
    const { alice, bob, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    bob.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    expect(
      host.frames.every(
        ({ message }) =>
          message.type !== 'room.updated' || message.view.phase !== 'buzzed'
      )
    ).toBe(true)
    expect(hostView(host)?.round?.activeBuzz).toBeNull()
  })

  it('[reflex] refuses a second press from the same player', async () => {
    const { alice, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(
      () => (reflexRound(hostView(host))?.presses.length ?? 0) === 1,
      "Alice's press"
    )
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => errorsIn(alice).length > 0, 'the refusal')

    expect(errorsIn(alice)[0]?.code).toBe('already_buzzed')
    expect(reflexRound(hostView(host))?.presses).toHaveLength(1)
  })

  // The heat has no other way to end when one player's screen is face down on
  // the table, and the host pressing a button between every round is not a
  // reflex game.
  it('[reflex] closes the heat on its own when somebody never presses', async () => {
    const { alice, host, round } = await openPlayingRound()

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(
      () => hostView(host)?.phase === 'revealed',
      'the press window to run out',
      3_000
    )

    expect(scoreOf(host, 'Alice')).toBe(1)
    expect(scoreOf(host, 'Bob')).toBe(0)
  })
})

describe('a player who went too early', () => {
  it('[reflex] refuses a press that beat the screen', async () => {
    const { alice, aliceId, host, round } = await openPlayingRound()

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => errorsIn(alice).length > 0, 'the refusal')

    expect(errorsIn(alice)[0]?.code).toBe('false_start')
    expect(hostView(host)?.round?.lockedOutPlayerIds).toEqual([aliceId])
    expect(reflexRound(hostView(host))?.presses).toEqual([])
  })

  // A false start takes one player out of the heat, not the heat away from the
  // room — and the press that went early has spent itself, so nothing waits for
  // it either.
  it('[reflex] carries the heat on, and hands it to whoever waited', async () => {
    const { alice, bob, bobId, host, round } = await openPlayingRound()

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => errorsIn(alice).length > 0, 'the false start')

    expect(hostView(host)?.phase).toBe('playing')

    await untilTheFlipIsFair(host)
    bob.send({ roundId: round.id, type: 'player.buzz' })

    // Shorter than the press window on purpose: the heat has to close on Bob's
    // press rather than on the clock, or a false start costs the whole room the
    // rest of the window every time.
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal', 300)

    expect(hostView(host)?.round?.awards[0]?.playerId).toBe(bobId)
    expect(scoreOf(host, 'Alice')).toBe(0)
  })

  it('[reflex] refuses the player who already went early a second go', async () => {
    const { alice, host, round } = await openPlayingRound()

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => errorsIn(alice).length > 0, 'the false start')

    await untilTheFlipIsFair(host)
    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => errorsIn(alice).length > 1, 'the second refusal')

    expect(errorsIn(alice)[1]?.code).toBe('player_locked_out')
  })
})

describe('the modes this game offers', () => {
  it('[reflex] refuses settings that put a typed field over a screen changing colour', async () => {
    const { code, host } = await room.openRoom(REFLEX_GAME)

    host.send({
      settings: { ...REFLEX_GAME, mode: DEFAULT_MODE_SETTINGS.typed },
      type: 'host.updateSettings'
    })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(hostView(host)?.settings.mode.kind).toBe('buzzer')
    expect(code).toHaveLength(4)
  })
})
