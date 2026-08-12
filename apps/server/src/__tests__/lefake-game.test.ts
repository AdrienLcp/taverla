import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_LEFAKE_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import type { PlayerServerMessage } from '@taverla/protocol/server-message'

import {
  errorsIn,
  hostLefakeContent,
  hostView,
  lefakeRound,
  type Peer,
  playerView,
  QUESTIONS,
  type RoomHarness,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/questions/question-bank', async () => {
  const { questionBankStub } = await import('./room-harness')

  return questionBankStub()
})

/**
 * Both deadlines are set high enough that nothing in this suite reaches one:
 * every phase here is closed by the last player acting, which is the path a room
 * actually takes. The clocks are covered by the settings the protocol enforces.
 */
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

const [FIRST_QUESTION] = QUESTIONS

const roundIdOf = (player: Peer<PlayerServerMessage>): string => {
  const id = playerView(player)?.round?.id

  if (id === undefined) {
    throw new Error('the round has not started')
  }

  return id
}

const boardOf = (player: Peer<PlayerServerMessage>) =>
  lefakeRound(playerView(player))?.board ?? []

const lineSaying = (
  player: Peer<PlayerServerMessage>,
  text: string
): string => {
  const found = boardOf(player).find((entry) => entry.text === text)

  if (found === undefined) {
    throw new Error(`no line saying "${text}" on the board`)
  }

  return found.id
}

describe('le fake', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const openWriting = async (settings: RoomSettings = LE_FAKE) => {
    const { code, host } = await harness.openRoom(settings)
    const ana = await harness.seat({ code, nickname: 'Ana' })
    const bo = await harness.seat({ code, nickname: 'Bo' })
    const cy = await harness.seat({ code, nickname: 'Cy' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'playing',
      'the writing to open'
    )

    return { ana, bo, code, cy, host }
  }

  it('[lefake] runs a whole round: write, vote, tally, reveal', async () => {
    const { ana, bo, cy, host } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    cy.send({ lie: "L'Eiger", roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    // Three lies and the truth is four, so one authored decoy tops it up.
    expect(boardOf(ana)).toHaveLength(5)

    const truth = lineSaying(ana, FIRST_QUESTION?.answer ?? '')

    ana.send({ candidateId: truth, roundId, type: 'lefake.vote' })
    bo.send({ candidateId: truth, roundId, type: 'lefake.vote' })
    cy.send({
      candidateId: lineSaying(cy, 'Le Mont Rose'),
      roundId,
      type: 'lefake.vote'
    })

    await waitFor(
      () => playerView(ana)?.phase === 'revealed',
      'the tally to land'
    )

    const scores = new Map(
      playerView(ana)?.players.map(({ nickname, score }) => [nickname, score])
    )

    // Ana and Bo found it: two each. Cy fell for Ana's lie, so Ana takes one
    // more for being believed, and Cy leaves with nothing.
    expect(scores.get('Ana')).toBe(3)
    expect(scores.get('Bo')).toBe(2)
    expect(scores.get('Cy')).toBe(0)

    const revealed = lefakeRound(hostView(host))?.revealedBoard ?? []

    expect(revealed.find((entry) => entry.isTruth)?.voterIds).toHaveLength(2)
    expect(
      revealed.find((entry) => entry.text === 'Le Mont Rose')?.authorIds
    ).toHaveLength(1)
  })

  it('[lefake] tells a player nothing about the board but what it says', async () => {
    const { ana, bo, cy } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    cy.send({ lie: "L'Eiger", roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    // Every line a player holds carries exactly what it says and its id. The
    // truth is on that board on purpose — finding it is the game — so what has
    // to stay off it is which one that is, and who wrote the rest.
    for (const entry of boardOf(ana)) {
      expect(Object.keys(entry).sort()).toEqual(['id', 'text'])
    }

    const beforeTheReveal = ana.frames.filter(
      ({ message }) =>
        message.type !== 'room.updated' || message.view.phase !== 'revealed'
    )

    for (const { raw } of beforeTheReveal) {
      expect(raw).not.toContain('isTruth')
      expect(raw).not.toContain('authorIds')
      expect(raw).not.toContain('voterIds')
      expect(raw).not.toContain(FIRST_QUESTION?.note ?? '')
    }
  })

  it('[lefake] refuses a lie that is the answer, and says why', async () => {
    const { ana } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({
      lie: FIRST_QUESTION?.answer ?? '',
      roundId,
      type: 'lefake.submit'
    })

    await waitFor(() => errorsIn(ana).length > 0, 'the refusal')

    expect(errorsIn(ana)[0]).toMatchObject({
      code: 'lie_is_the_answer',
      fatal: false
    })
  })

  it('[lefake] refuses an accepted spelling of the answer too', async () => {
    const { ana } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'cervin', roundId, type: 'lefake.submit' })

    await waitFor(() => errorsIn(ana).length > 0, 'the refusal')

    expect(errorsIn(ana)[0]).toMatchObject({ code: 'lie_is_the_answer' })
  })

  it('[lefake] merges two identical lies into one line and credits both', async () => {
    const { ana, bo, cy } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'la jungfrau', roundId, type: 'lefake.submit' })
    cy.send({ lie: "L'Eiger", roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(cy)?.phase === 'voting',
      'the board to go up'
    )

    expect(
      boardOf(cy).filter((entry) => entry.text.toLowerCase() === 'la jungfrau')
    ).toHaveLength(1)

    ana.send({
      candidateId: lineSaying(ana, FIRST_QUESTION?.answer ?? ''),
      roundId,
      type: 'lefake.vote'
    })
    bo.send({
      candidateId: lineSaying(bo, FIRST_QUESTION?.answer ?? ''),
      roundId,
      type: 'lefake.vote'
    })
    cy.send({
      candidateId: lineSaying(cy, 'La Jungfrau'),
      roundId,
      type: 'lefake.vote'
    })

    await waitFor(() => playerView(cy)?.phase === 'revealed', 'the tally')

    const scores = new Map(
      playerView(cy)?.players.map(({ nickname, score }) => [nickname, score])
    )

    // One vote landed on the line they share, and it pays both of them in full.
    expect(scores.get('Ana')).toBe(3)
    expect(scores.get('Bo')).toBe(3)
  })

  it('[lefake] refuses a vote for a line the voter wrote', async () => {
    const { ana, bo, cy } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    cy.send({ lie: "L'Eiger", roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    ana.send({
      candidateId: lineSaying(ana, 'Le Mont Rose'),
      roundId,
      type: 'lefake.vote'
    })

    await waitFor(() => errorsIn(ana).length > 0, 'the refusal')

    expect(errorsIn(ana)[0]).toMatchObject({ code: 'cannot_vote_for_own_lie' })
    expect(playerView(ana)?.phase).toBe('voting')
  })

  it('[lefake] tells a player which line is theirs, so their screen can grey it out', async () => {
    const { ana, bo, cy } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })
    cy.send({ lie: "L'Eiger", roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    expect(lefakeRound(playerView(ana))?.yourCandidateId).toBe(
      lineSaying(ana, 'Le Mont Rose')
    )
    expect(lefakeRound(playerView(bo))?.yourCandidateId).toBe(
      lineSaying(bo, 'La Jungfrau')
    )
  })

  it('[lefake] refuses a second lie from the same player', async () => {
    const { ana } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    await waitFor(
      () => (lefakeRound(playerView(ana))?.votedPlayerIds ?? []).length === 0,
      'the lie to land'
    )
    ana.send({ lie: 'La Jungfrau', roundId, type: 'lefake.submit' })

    await waitFor(() => errorsIn(ana).length > 0, 'the refusal')

    expect(errorsIn(ana)[0]).toMatchObject({ code: 'already_buzzed' })
  })

  it('[lefake] gives a lone writer a full board out of the decoys', async () => {
    const { code, host } = await harness.openRoom(LE_FAKE)
    const ana = await harness.seat({ code, nickname: 'Ana' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'playing',
      'the writing to open'
    )

    ana.send({
      lie: 'Le Mont Rose',
      roundId: roundIdOf(ana),
      type: 'lefake.submit'
    })

    await waitFor(
      () => playerView(ana)?.phase === 'voting',
      'the board to go up'
    )

    expect(boardOf(ana)).toHaveLength(5)
  })

  it('[lefake] hands the host screen nothing the room cannot already see', async () => {
    const { code, host } = await harness.openRoom(LE_FAKE)
    const ana = await harness.seat({ code, nickname: 'Ana' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'playing',
      'the writing to open'
    )

    // Everyone in the room is looking at this screen, so its arm carries the
    // kind and nothing else — the answer would be on the wall while they write.
    expect(hostLefakeContent(host)).toEqual({ kind: 'lefake' })

    for (const { raw } of host.frames) {
      expect(raw).not.toContain(FIRST_QUESTION?.note ?? '')
    }
  })

  it('[lefake] puts the board up when the host says so, rather than ending the round', async () => {
    const { ana, bo, cy, host } = await openWriting()
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })

    await waitFor(
      () => (lefakeRound(playerView(bo))?.board ?? null) === null,
      'the writing to still be open'
    )

    host.send({ roundId, type: 'host.reveal' })

    await waitFor(
      () => playerView(cy)?.phase === 'voting',
      'the board to go up'
    )

    expect(playerView(cy)?.phase).toBe('voting')
    expect(boardOf(cy)).toHaveLength(5)
  })

  /**
   * The clock is optional in both of this game's phases, and a room that turned
   * it off has nothing but the host to close the board. The reveal is the same
   * control that put it up, one press later.
   */
  it('[lefake] closes a board with no clock on the host word alone', async () => {
    const { ana, bo, cy, host } = await openWriting({
      ...LE_FAKE,
      game: {
        ...DEFAULT_LEFAKE_SETTINGS,
        roundDurationMs: null,
        voteDurationMs: null
      }
    })
    const roundId = roundIdOf(ana)

    ana.send({ lie: 'Le Mont Rose', roundId, type: 'lefake.submit' })
    bo.send({ lie: 'Le Mont Blanc', roundId, type: 'lefake.submit' })
    cy.send({ lie: 'Le Mont Bleu', roundId, type: 'lefake.submit' })

    await waitFor(
      () => playerView(cy)?.phase === 'voting',
      'the board to go up once everybody has written'
    )

    host.send({ roundId, type: 'host.reveal' })

    await waitFor(
      () => playerView(cy)?.phase === 'revealed',
      'the host to close a board nothing else would have closed'
    )

    expect(playerView(cy)?.phase).toBe('revealed')
  })
})
