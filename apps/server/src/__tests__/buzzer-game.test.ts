import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_BUZZER_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

import {
  errorsIn,
  halves,
  hostView,
  playerView,
  type RoomHarness,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/**
 * The game the shelf opens on: no catalogue, no clip, and no end until the host
 * says so. Pinned rather than inherited for the same reason `FAST_GAME` is.
 */
const BUZZER_GAME: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: DEFAULT_BUZZER_SETTINGS,
  mode: DEFAULT_MODE_SETTINGS.buzzer,
  roundCount: null
}

const RIGHT = { isCorrect: true, kind: 'single' } as const
const WRONG = { isCorrect: false, kind: 'single' } as const

let room: RoomHarness

beforeEach(async () => {
  room = await startRoomHarness()
})

afterEach(async () => {
  await room.stop()
})

const openPlayingRound = async (settings: RoomSettings = BUZZER_GAME) => {
  const { code, host } = await room.openRoom(settings)
  const alice = await room.seat({ code, nickname: 'Alice' })
  const bob = await room.seat({ code, nickname: 'Bob' })

  host.send({ type: 'host.startRound' })
  await waitFor(() => hostView(host)?.phase === 'playing', 'the round to open')

  const round = hostView(host)?.round

  if (round == null) {
    throw new Error('The round vanished as it opened')
  }

  return { alice, bob, code, host, round }
}

const buzz = async (
  peer: Awaited<ReturnType<RoomHarness['seat']>>,
  host: Awaited<ReturnType<RoomHarness['openRoom']>>['host'],
  roundId: string
) => {
  peer.send({ roundId, type: 'player.buzz' })
  await waitFor(
    () => hostView(host)?.phase === 'buzzed',
    'the buzz to register'
  )

  return playerView(peer)?.youId ?? ''
}

describe('a round the room supplies itself', () => {
  // The whole claim of this game: the server is not a source of questions, so
  // opening a round costs no catalogue call and holds nothing to leak.
  it('[buzzer] opens a round holding nothing at all', async () => {
    const { host } = await openPlayingRound()
    const view = hostView(host)

    expect(view?.currentContent).toEqual({ kind: 'buzzer' })
    expect(view?.round?.content).toEqual({ kind: 'buzzer' })
    expect(view?.remainingPoolSize).toBe(0)
  })

  it('[buzzer] pays one point for a claim, where the blind test pays two', async () => {
    const { alice, host, round } = await openPlayingRound()
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: RIGHT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    expect(
      hostView(host)?.players.find((player) => player.nickname === 'Alice')
        ?.score
    ).toBe(1)
  })

  // A host socket is as forgeable as a player's, and two halves over a game
  // with one claim is a charade paid at twice its price.
  it('[buzzer] refuses a verdict of a shape this game is not judged in', async () => {
    const { alice, host, round } = await openPlayingRound()
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: halves(true, true)
    })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(hostView(host)?.phase).toBe('buzzed')
    expect(
      hostView(host)?.players.find((player) => player.nickname === 'Alice')
        ?.score
    ).toBe(0)
  })

  // The blind test resumes a missed round only while its clip has time left.
  // This one has no clip, so the only thing that can end it is the room.
  it('[buzzer] hands the floor back after a miss, with no clock to run out', async () => {
    const { alice, host, round } = await openPlayingRound()
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: WRONG
    })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the round to carry on'
    )

    expect(hostView(host)?.round?.lockedOutPlayerIds).toEqual([aliceId])
    expect(hostView(host)?.round?.id).toBe(round.id)
  })

  it('[buzzer] puts a player who missed back in when the host reopens the field', async () => {
    const { alice, host, round } = await openPlayingRound()
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: WRONG
    })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the round to carry on'
    )

    host.send({ roundId: round.id, type: 'host.clearLockouts' })
    await waitFor(
      () => hostView(host)?.round?.lockedOutPlayerIds.length === 0,
      'the field to reopen'
    )

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the second buzz')

    expect(hostView(host)?.round?.activeBuzz?.playerId).toBe(aliceId)
    expect(errorsIn(alice)).toEqual([])
  })

  it('[buzzer] leaves the field open when the host turned the lockout off', async () => {
    const { alice, host, round } = await openPlayingRound({
      ...BUZZER_GAME,
      game: { kind: 'buzzer', locksOutOnMiss: false }
    })
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: WRONG
    })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the round to carry on'
    )

    expect(hostView(host)?.round?.lockedOutPlayerIds).toEqual([])
  })

  // A charade evening stops when the host stops. A fixed count is the blind
  // test's shape, and the room must not inherit it.
  it('[buzzer] opens another round rather than ending a game with no last one', async () => {
    const { alice, host, round } = await openPlayingRound()
    const aliceId = await buzz(alice, host, round.id)

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: RIGHT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    host.send({ type: 'host.nextRound' })
    await waitFor(() => hostView(host)?.round?.index === 2, 'the second round')

    expect(hostView(host)?.phase).not.toBe('finished')
  })
})

describe('the modes a game offers', () => {
  it('[buzzer] refuses settings that put a typed field over a game serving nothing', async () => {
    const { code, host } = await room.openRoom(BUZZER_GAME)

    host.send({
      settings: { ...BUZZER_GAME, mode: DEFAULT_MODE_SETTINGS.typed },
      type: 'host.updateSettings'
    })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(hostView(host)?.settings.mode.kind).toBe('buzzer')
    expect(code).toHaveLength(4)
  })
})
