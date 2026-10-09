import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_QUIZ_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import {
  POINTS_FOR_A_CLAIM,
  POINTS_FOR_A_RIGHT_CHOICE,
  POINTS_FOR_A_TYPED_ANSWER
} from '@taverla/protocol/scoring'

import { startRoomHarness } from './node-room-harness'
import {
  basePointsFor,
  errorsIn,
  hostQuestion,
  hostView,
  playerView,
  QUESTIONS,
  quizRound,
  type RoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/questions/question-bank', async () => {
  const { questionBankStub } = await import('./room-harness')

  return questionBankStub()
})

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const quizWith = (mode: RoomSettings['mode']): RoomSettings => ({
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: { ...DEFAULT_QUIZ_SETTINGS, roundDurationMs: 5_000 },
  mode,
  roundCount: 3
})

const TYPED_QUIZ = quizWith(DEFAULT_MODE_SETTINGS.typed)
const CHOICE_QUIZ = quizWith(DEFAULT_MODE_SETTINGS.choice)
const BUZZER_QUIZ = quizWith(DEFAULT_MODE_SETTINGS.buzzer)

/** Every string a player must never be handed before the answer is public. */
const SECRETS = [
  ...QUESTIONS.map((question) => question.answer),
  ...QUESTIONS.flatMap((question) => question.accepted),
  ...QUESTIONS.map((question) => question.note)
]

const transcriptOf = (peer: { frames: { raw: string }[] }): string =>
  peer.frames.map(({ raw }) => raw).join('')

describe('a quiz through the seam', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const roundInPlay = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the question to open'
    )

    return { code, host, zoe }
  }

  /**
   * A second seat nobody answers from, for the assertions that need the round
   * to stay open: one player finishing is what closes a simultaneous round, so
   * a solo player's first pick reveals the answer before anything else can be
   * sent.
   */
  const contestedRoundInPlay = async (settings: RoomSettings) => {
    const { code, host } = await harness.openRoom(settings)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    await harness.seat({ code, nickname: 'Max' })
    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the question to open'
    )

    return { code, host, zoe }
  }

  it('[quiz] opens a round with no catalogue behind it', async () => {
    const { host, zoe } = await roundInPlay(TYPED_QUIZ)

    expect(quizRound(playerView(zoe))?.prompt.prompt).toBe(QUESTIONS[0]?.prompt)
    expect(hostQuestion(host)?.answer).toBe(QUESTIONS[0]?.answer)
  })

  /**
   * The stage-01 assertion, over the game that made the seam necessary: a leak
   * in any frame of a whole round is a leak, and searching the transcript is
   * what catches one that a later frame tidied away.
   */
  it('[quiz] tells a player nothing they could answer with, all round', async () => {
    const { host, zoe } = await roundInPlay(TYPED_QUIZ)

    const roundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({
      answer: { guess: 'somewhere in the alps', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(
      () => (playerView(zoe)?.round?.answers.length ?? 0) === 1,
      'the guess to land'
    )

    const beforeTheReveal = transcriptOf(zoe)

    for (const secret of SECRETS) {
      expect(beforeTheReveal).not.toContain(secret)
    }

    expect(beforeTheReveal).not.toContain('correctChoiceIndex')
    expect(beforeTheReveal).not.toContain('accepted')

    host.send({ roundId, type: 'host.reveal' })
    await waitFor(
      () => quizRound(playerView(zoe))?.revealedQuestion !== null,
      'the answer to be published'
    )

    const revealed = quizRound(playerView(zoe))?.revealedQuestion

    expect(revealed?.answer).toBe(QUESTIONS[0]?.answer)
    expect(revealed?.note).toBe(QUESTIONS[0]?.note)
  })

  it('[quiz] hands out four candidates and never which is right', async () => {
    const { zoe } = await roundInPlay(CHOICE_QUIZ)

    const choices = quizRound(playerView(zoe))?.choices ?? []

    expect(choices).toHaveLength(4)
    expect(choices.toSorted()).toEqual(
      [QUESTIONS[0]?.answer, ...(QUESTIONS[0]?.decoys ?? [])].toSorted()
    )
    expect(transcriptOf(zoe)).not.toContain('correctChoiceIndex')
  })

  it('[quiz] pays a typed answer three where a pick pays one', async () => {
    const typed = await roundInPlay(TYPED_QUIZ)

    typed.zoe.send({
      answer: { guess: 'le cervin', kind: 'typed' },
      roundId: playerView(typed.zoe)?.round?.id ?? '',
      type: 'player.answer'
    })
    await waitFor(
      () => playerView(typed.zoe)?.phase === 'revealed',
      'the typed round to close'
    )

    // Three for the claim, with whatever the clock paid taken back off — that
    // share falls with real elapsed time and is the same in both modes.
    expect(
      basePointsFor({
        playerId: playerView(typed.zoe)?.youId ?? null,
        view: playerView(typed.zoe)
      })
    ).toBe(POINTS_FOR_A_TYPED_ANSWER)

    await harness.stop()
    harness = await startRoomHarness()

    const picked = await roundInPlay(CHOICE_QUIZ)
    const choices = quizRound(playerView(picked.zoe))?.choices ?? []

    picked.zoe.send({
      answer: {
        choiceIndex: choices.indexOf(QUESTIONS[0]?.answer ?? ''),
        kind: 'choice'
      },
      roundId: playerView(picked.zoe)?.round?.id ?? '',
      type: 'player.answer'
    })
    await waitFor(
      () => playerView(picked.zoe)?.phase === 'revealed',
      'the pick round to close'
    )

    expect(
      basePointsFor({
        playerId: playerView(picked.zoe)?.youId ?? null,
        view: playerView(picked.zoe)
      })
    ).toBe(POINTS_FOR_A_RIGHT_CHOICE)
  })

  /**
   * What the second game found wrong with the first: a claim the server judges
   * in silence needs the same feedback a pair of halves does. Without it a
   * player who is already right keeps typing, and the refusal reads as a
   * lockout rather than as a win.
   */
  it('[quiz] tells a player they already hold the answer', async () => {
    const { zoe } = await roundInPlay(TYPED_QUIZ)

    const roundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({
      answer: { guess: 'mont blanc', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(
      () => playerView(zoe)?.yourVerdict !== null,
      'the miss to be graded'
    )

    expect(playerView(zoe)?.yourVerdict).toEqual({
      isCorrect: false,
      kind: 'single'
    })

    zoe.send({
      answer: { guess: 'cervin', kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the accepted spelling to close the round'
    )

    expect(playerView(zoe)?.yourVerdict).toEqual({
      isCorrect: true,
      kind: 'single'
    })
  })

  it('[quiz] refuses a second pick, and keeps typing open until it lands', async () => {
    const picked = await contestedRoundInPlay(CHOICE_QUIZ)
    const twice = {
      answer: { choiceIndex: 0, kind: 'choice' as const },
      roundId: playerView(picked.zoe)?.round?.id ?? '',
      type: 'player.answer' as const
    }

    picked.zoe.send(twice)
    picked.zoe.send(twice)

    await waitFor(() => errorsIn(picked.zoe).length > 0, 'the refusal')
    expect(errorsIn(picked.zoe)[0]).toMatchObject({ code: 'already_buzzed' })

    await harness.stop()
    harness = await startRoomHarness()

    const typed = await contestedRoundInPlay(TYPED_QUIZ)
    const typedRoundId = playerView(typed.zoe)?.round?.id ?? ''

    for (const guess of ['not it', 'still not it']) {
      typed.zoe.send({
        answer: { guess, kind: 'typed' },
        roundId: typedRoundId,
        type: 'player.answer'
      })
    }

    await waitFor(
      () => playerView(typed.zoe)?.round?.answers.length === 1,
      'both guesses to be taken'
    )
    expect(errorsIn(typed.zoe)).toEqual([])
  })

  /**
   * The verdict is the game's, and a host socket is as forgeable as a player's.
   * A `halves` verdict here would pay two points for one question.
   */
  it('[quiz] refuses a verdict of the blind test’s shape', async () => {
    const { code, host } = await harness.openRoom(BUZZER_QUIZ)
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(zoe)?.phase === 'playing',
      'the question to open'
    )

    const roundId = playerView(zoe)?.round?.id ?? ''

    zoe.send({ roundId, type: 'player.buzz' })
    await waitFor(
      () => hostView(host)?.round?.activeBuzz !== null,
      'the floor to be taken'
    )

    host.send({
      playerId: playerView(zoe)?.youId ?? '',
      roundId,
      type: 'host.judge',
      verdict: { artistCorrect: true, kind: 'halves', titleCorrect: true }
    })

    await waitFor(() => errorsIn(host).length > 0, 'the refusal')
    expect(errorsIn(host)[0]).toMatchObject({ code: 'invalid_message' })
    expect(playerView(zoe)?.players[0]?.score).toBe(0)

    host.send({
      playerId: playerView(zoe)?.youId ?? '',
      roundId,
      type: 'host.judge',
      verdict: { isCorrect: true, kind: 'single' }
    })
    await waitFor(
      () => playerView(zoe)?.phase === 'revealed',
      'the round to close on a granted claim'
    )

    expect(playerView(zoe)?.players[0]?.score).toBe(POINTS_FOR_A_CLAIM)
  })

  it('[quiz] never asks the same question twice in one game', async () => {
    const { host, zoe } = await roundInPlay(TYPED_QUIZ)

    const asked = new Set<string>()

    for (let round = 0; round < 3; round++) {
      await waitFor(
        () => playerView(zoe)?.round?.index === round + 1,
        `round ${round + 1} to open`
      )

      const id = quizRound(playerView(zoe))?.prompt.id

      expect(asked.has(id ?? '')).toBe(false)
      asked.add(id ?? '')

      host.send({
        roundId: playerView(zoe)?.round?.id ?? '',
        type: 'host.reveal'
      })
      await waitFor(
        () => playerView(zoe)?.phase === 'revealed',
        `round ${round + 1} to close`
      )

      if (round < 2) {
        host.send({ type: 'host.nextRound' })
      }
    }

    expect(asked.size).toBe(3)
  })
})
