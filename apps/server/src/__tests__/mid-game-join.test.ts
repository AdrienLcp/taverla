import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_BUZZER_SETTINGS,
  DEFAULT_LEFAKE_SETTINGS
} from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'

import {
  errorsIn,
  FAST_GAME,
  hostView,
  lefakeRound,
  playerView,
  QUESTIONS,
  type RoomHarness,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

vi.mock('@/infrastructure/questions/question-bank', async () => {
  const { questionBankStub } = await import('./room-harness')

  return questionBankStub()
})

const CHOICE_GAME: RoomSettings = {
  ...FAST_GAME,
  mode: DEFAULT_MODE_SETTINGS.choice
}

const LE_FAKE: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: {
    ...DEFAULT_LEFAKE_SETTINGS,
    roundDurationMs: 30_000,
    voteDurationMs: 30_000
  },
  mode: DEFAULT_MODE_SETTINGS.choice,
  roundCount: 3
}

const BUZZER_GAME: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: DEFAULT_BUZZER_SETTINGS,
  mode: DEFAULT_MODE_SETTINGS.buzzer,
  roundCount: null
}

const WRONG = { isCorrect: false, kind: 'single' } as const

describe('a player who arrives mid-game', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const roundUnderWay = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })
    const max = await harness.seat({ code, nickname: 'Max' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the round to open'
    )

    const nina = await harness.seat({ code, nickname: 'Nina' })

    await waitFor(
      () => (playerView(zoe)?.players.length ?? 0) === 3,
      'the room to see Nina arrive'
    )

    return { code, host, max, nina, zoe }
  }

  /**
   * The symptom that is actually felt at a table: without the round's own
   * roster, one player arriving holds a finished round open to its full
   * deadline, and everybody sits there watching a bar run down.
   */
  it('[latecomer] closes the round on the players it opened on', async () => {
    const { max, zoe } = await roundUnderWay(CHOICE_GAME)
    const roundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({
      answer: { choiceIndex: 0, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })
    max.send({
      answer: { choiceIndex: 0, kind: 'choice' },
      roundId,
      type: 'player.answer'
    })

    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close on the two who were in it'
    )
  })

  it('[latecomer] refuses an answer to the round it walked in on', async () => {
    const { nina, zoe } = await roundUnderWay(CHOICE_GAME)

    nina.send({
      answer: { choiceIndex: 0, kind: 'choice' },
      roundId: playerView(zoe)?.round?.id ?? '',
      type: 'player.answer'
    })

    await waitFor(() => errorsIn(nina).length === 1, 'the refusal')

    expect(errorsIn(nina)[0]).toMatchObject({
      code: 'joined_mid_round',
      fatal: false
    })
    expect(playerView(zoe)?.round?.answers).toHaveLength(0)
  })

  it('[latecomer] tells that player, and only that player, that they are waiting', async () => {
    const { nina, zoe } = await roundUnderWay(CHOICE_GAME)

    expect(playerView(nina)?.round?.joinedAfterStart).toBe(true)
    expect(playerView(zoe)?.round?.joinedAfterStart).toBe(false)
  })

  it('[latecomer] plays the next round like anybody else', async () => {
    const { host, max, nina, zoe } = await roundUnderWay(CHOICE_GAME)
    const answer = {
      answer: { choiceIndex: 0, kind: 'choice' as const },
      type: 'player.answer' as const
    }
    const firstRoundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({ ...answer, roundId: firstRoundId })
    max.send({ ...answer, roundId: firstRoundId })
    await waitFor(
      () => playerView(nina)?.phase === 'revealed',
      'the first round to close'
    )

    host.send({ type: 'host.nextRound' })
    await waitFor(
      () => playerView(nina)?.phase === 'playing',
      'the second round to open'
    )

    expect(playerView(nina)?.round?.joinedAfterStart).toBe(false)

    const secondRoundId = playerView(nina)?.round?.id ?? ''

    nina.send({ ...answer, roundId: secondRoundId })
    await waitFor(
      () => (playerView(zoe)?.round?.answers.length ?? 0) === 1,
      'the room to see Nina answer'
    )

    // Still open: the round Nina was in from the start waits for her table too.
    expect(playerView(zoe)?.phase).toBe('playing')
    expect(errorsIn(nina)).toHaveLength(0)
  })

  /**
   * One stamp covers the whole round, so somebody who walks in on the board
   * neither votes on lies they never saw nor holds the tally up.
   */
  it('[latecomer] closes the vote on the players who wrote', async () => {
    const { code, host } = await harness.openRoom(LE_FAKE)
    const ana = await harness.seat({ code, nickname: 'Ana' })
    const bo = await harness.seat({ code, nickname: 'Bo' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'playing',
      'the writing to open'
    )

    const roundId = playerView(ana)?.round?.id ?? ''

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    const nina = await harness.seat({ code, nickname: 'Nina' })

    await waitFor(
      () => (playerView(ana)?.players.length ?? 0) === 3,
      'the room to see Nina arrive'
    )

    const truth =
      lefakeRound(playerView(ana))?.board?.find(
        (entry) => entry.text === QUESTIONS[0]?.answer
      )?.id ?? ''

    nina.send({ candidateId: truth, roundId, type: 'lefake.vote' })
    await waitFor(() => errorsIn(nina).length === 1, 'the refusal')

    expect(errorsIn(nina)[0]).toMatchObject({ code: 'joined_mid_round' })

    ana.send({ candidateId: truth, roundId, type: 'lefake.vote' })
    bo.send({ candidateId: truth, roundId, type: 'lefake.vote' })
    await waitFor(
      () => playerView(ana)?.phase === 'revealed',
      'the tally to land on the two who wrote'
    )
  })

  /**
   * A buzzer round has no clip to run out, so the only thing that ends one
   * everybody has missed is nobody being left to answer it.
   */
  it('[latecomer] reveals a round every player of its own is locked out of', async () => {
    const { code, host } = await harness.openRoom(BUZZER_GAME)
    const alice = await harness.seat({ code, nickname: 'Alice' })
    const bob = await harness.seat({ code, nickname: 'Bob' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the round to open'
    )

    const roundId = hostView(host)?.round?.id ?? ''

    const missBy = async (peer: typeof alice) => {
      peer.send({ roundId, type: 'player.buzz' })
      await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

      host.send({
        playerId: playerView(peer)?.youId ?? '',
        roundId,
        type: 'host.judge',
        verdict: WRONG
      })
    }

    await missBy(alice)
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the round to carry on for Bob'
    )

    await harness.seat({ code, nickname: 'Nina' })
    await waitFor(
      () => (hostView(host)?.players.length ?? 0) === 3,
      'the room to see Nina arrive'
    )

    await missBy(bob)
    await waitFor(
      () => hostView(host)?.phase === 'revealed',
      'the reveal, with nobody of its own left to answer'
    )
  })
})
