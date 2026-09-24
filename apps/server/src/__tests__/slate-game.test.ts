import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SLATE_SETTINGS } from '@taverla/protocol/game'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import type {
  HostServerMessage,
  PlayerServerMessage
} from '@taverla/protocol/server-message'

import {
  errorsIn,
  hostSlateContent,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  sessionIdOf,
  slateRound,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const SLATE: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: { ...DEFAULT_SLATE_SETTINGS, itemCount: 3 },
  mode: DEFAULT_MODE_SETTINGS.typed,
  roundCount: 1
}

/** Strings no fixture, nickname or id could contain by accident. */
const ANA_SECRET = 'Paprika fumé d’Ana'
const BO_SECRET = 'Barbecue de Bo'
const KEY_SECRET = 'Clé du chef: vinaigre'

const roundIdOf = (peer: {
  frames: Peer<PlayerServerMessage>['frames']
}): string => {
  for (const { message } of peer.frames.toReversed()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      const id = message.view.round?.id

      if (id !== undefined) {
        return id
      }
    }
  }

  throw new Error('the round has not started')
}

const hostRoundIdOf = (host: Peer<HostServerMessage>): string => {
  const id = hostView(host)?.round?.id

  if (id === undefined) {
    throw new Error('the round has not started')
  }

  return id
}

const sheetOf = (player: Peer<PlayerServerMessage>) =>
  slateRound(playerView(player))?.yourSheet ?? []

const answersOf = (player: Peer<PlayerServerMessage>) =>
  sheetOf(player).map((line) => line.answer)

const scoreOf = (host: Peer<HostServerMessage>, playerId: string) =>
  hostView(host)?.players.find((player) => player.id === playerId)?.score

const idOf = (player: Peer<PlayerServerMessage>): string => {
  const id = playerView(player)?.youId

  if (id === undefined) {
    throw new Error('that player was never seated')
  }

  return id
}

const rawTranscript = (peer: { frames: { raw: string }[] }): string =>
  peer.frames.map(({ raw }) => raw).join('\n')

describe('slate', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const openSheets = async (settings: RoomSettings = SLATE) => {
    const { code, host } = await harness.openRoom(settings)
    const ana = await harness.seat({ code, nickname: 'Ana' })
    const bo = await harness.seat({ code, nickname: 'Bo' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'playing',
      'the sheets to open'
    )

    return { ana, bo, code, host, roundId: roundIdOf(ana) }
  }

  const write = async ({
    answer,
    itemIndex,
    player,
    roundId
  }: {
    answer: string
    itemIndex: number
    player: Peer<PlayerServerMessage>
    roundId: string
  }) => {
    player.send({ answer, itemIndex, roundId, type: 'slate.write' })
    await waitFor(
      () => answersOf(player)[itemIndex] === (answer.trim() || null),
      `line ${itemIndex} to be saved`
    )
  }

  const collect = async ({
    host,
    roundId
  }: {
    host: Peer<HostServerMessage>
    roundId: string
  }) => {
    host.send({ roundId, type: 'host.collectSheets' })
    await waitFor(
      () => hostView(host)?.phase === 'correcting',
      'the sheets to be collected'
    )
  }

  const show = async ({
    host,
    itemIndex,
    roundId
  }: {
    host: Peer<HostServerMessage>
    itemIndex: number
    roundId: string
  }) => {
    host.send({ itemIndex, roundId, type: 'host.showItem' })
    await waitFor(
      () =>
        slateRound(hostView(host))?.currentItemIndex === itemIndex &&
        hostSlateContent(host)?.correction !== null,
      `item ${itemIndex} to be on the wall`
    )
  }

  const judge = ({
    groupKey,
    host,
    isCorrect,
    itemIndex,
    roundId
  }: {
    groupKey: string
    host: Peer<HostServerMessage>
    isCorrect: boolean
    itemIndex: number
    roundId: string
  }) => {
    host.send({
      groupKey,
      itemIndex,
      roundId,
      type: 'host.judgeGroup',
      verdict: { isCorrect, kind: 'single' }
    })
  }

  it('[slate] runs a whole sheet: write, collect, correct, reveal, final board', async () => {
    const { ana, bo, host, roundId } = await openSheets()

    await write({ answer: 'Sel', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'sel ', itemIndex: 0, player: bo, roundId })
    await write({ answer: 'Poivre', itemIndex: 2, player: ana, roundId })
    await collect({ host, roundId })

    expect(hostSlateContent(host)?.correction?.groups).toEqual([
      {
        isCorrect: null,
        key: 'sel',
        playerIds: [idOf(ana), idOf(bo)],
        text: 'Sel'
      }
    ])

    judge({ groupKey: 'sel', host, isCorrect: true, itemIndex: 0, roundId })
    await waitFor(() => scoreOf(host, idOf(bo)) === 1, 'the group to be paid')
    expect(scoreOf(host, idOf(ana))).toBe(1)

    await show({ host, itemIndex: 2, roundId })
    judge({ groupKey: 'poivre', host, isCorrect: true, itemIndex: 2, roundId })
    await waitFor(() => scoreOf(host, idOf(ana)) === 2, 'the third item paid')

    host.send({ roundId, type: 'host.reveal' })
    await waitFor(() => playerView(bo)?.phase === 'revealed', 'the reveal')

    expect(
      hostView(host)?.round?.awards.map(({ playerId, points }) => ({
        playerId,
        points
      }))
    ).toEqual([
      { playerId: idOf(ana), points: 2 },
      { playerId: idOf(bo), points: 1 }
    ])

    host.send({ type: 'host.nextRound' })
    await waitFor(
      () => playerView(ana)?.phase === 'finished',
      'the final board'
    )

    expect(playerView(ana)?.players.map((player) => player.score)).toEqual([
      2, 1
    ])
  })

  it('[slate] holds its reveal for the host whatever hold the room carries', async () => {
    const { bo, host, roundId } = await openSheets({
      ...SLATE,
      autoAdvanceMs: 2_000
    })

    await collect({ host, roundId })
    host.send({ roundId, type: 'host.reveal' })
    await waitFor(() => playerView(bo)?.phase === 'revealed', 'the reveal')

    expect(hostView(host)?.round?.advancesAt).toBeNull()
    expect(playerView(bo)?.round?.advancesAt).toBeNull()
  })

  // The whole transcript, not the last view: a leak in any frame is a leak.
  it('[slate] never sends a player another player’s answer, or any key', async () => {
    const { ana, bo, host, roundId } = await openSheets()

    host.send({
      itemIndex: 0,
      key: KEY_SECRET,
      roundId,
      type: 'host.setItemKey'
    })
    await waitFor(
      () => hostSlateContent(host)?.keys[0] === KEY_SECRET,
      'the key to be noted'
    )

    await write({ answer: ANA_SECRET, itemIndex: 0, player: ana, roundId })
    await write({ answer: BO_SECRET, itemIndex: 0, player: bo, roundId })
    await collect({ host, roundId })
    judge({
      groupKey: hostSlateContent(host)?.correction?.groups[0]?.key ?? '',
      host,
      isCorrect: true,
      itemIndex: 0,
      roundId
    })
    await show({ host, itemIndex: 1, roundId })
    host.send({ roundId, type: 'host.reveal' })
    await waitFor(() => playerView(ana)?.phase === 'revealed', 'the reveal')

    expect(rawTranscript(ana)).toContain(ANA_SECRET)
    expect(rawTranscript(ana)).not.toContain(BO_SECRET)
    expect(rawTranscript(ana)).not.toContain(KEY_SECRET)
    expect(rawTranscript(bo)).toContain(BO_SECRET)
    expect(rawTranscript(bo)).not.toContain(ANA_SECRET)
    expect(rawTranscript(bo)).not.toContain(KEY_SECRET)
  })

  // The host screen is the wall: while the room writes, it holds counts.
  it('[slate] shows the wall progress and not one answer before the collection', async () => {
    const { ana, bo, host, roundId } = await openSheets()

    await write({ answer: ANA_SECRET, itemIndex: 0, player: ana, roundId })
    await write({ answer: 'Sel', itemIndex: 1, player: ana, roundId })
    await write({ answer: BO_SECRET, itemIndex: 2, player: bo, roundId })
    await waitFor(
      () =>
        hostSlateContent(host)?.progress.find(
          (entry) => entry.playerId === idOf(bo)
        )?.filledCount === 1,
      'the progress to reach the wall'
    )

    expect(hostSlateContent(host)?.progress).toEqual([
      { filledCount: 2, playerId: idOf(ana) },
      { filledCount: 1, playerId: idOf(bo) }
    ])
    expect(hostSlateContent(host)?.correction).toBeNull()
    expect(rawTranscript(host)).not.toContain(ANA_SECRET)
    expect(rawTranscript(host)).not.toContain(BO_SECRET)

    await collect({ host, roundId })

    expect(hostSlateContent(host)?.correction?.groups[0]?.text).toBe(ANA_SECRET)
  })

  it('[slate] takes edits until the collection and refuses them after', async () => {
    const { ana, host, roundId } = await openSheets()

    await write({ answer: 'Sel', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'Poivre', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'Oignon', itemIndex: 1, player: ana, roundId })
    await write({ answer: '', itemIndex: 1, player: ana, roundId })

    expect(answersOf(ana)).toEqual(['Poivre', null, null])

    await collect({ host, roundId })
    ana.send({ answer: 'Ail', itemIndex: 2, roundId, type: 'slate.write' })
    await waitFor(() => errorsIn(ana).length > 0, 'the late edit refused')

    expect(errorsIn(ana).map((error) => error.code)).toEqual(['wrong_phase'])
    expect(answersOf(ana)).toEqual(['Poivre', null, null])
  })

  it('[slate] hands a player who arrives mid-sheet a sheet, and marks it', async () => {
    const { code, host, roundId } = await openSheets()
    const cy = await harness.seat({ code, nickname: 'Cy' })

    expect(playerView(cy)?.round?.joinedAfterStart).toBe(false)

    await write({ answer: 'Sel', itemIndex: 0, player: cy, roundId })
    await collect({ host, roundId })
    judge({ groupKey: 'sel', host, isCorrect: true, itemIndex: 0, roundId })
    await waitFor(() => scoreOf(host, idOf(cy)) === 1, 'the latecomer paid')

    const dee = await harness.seat({ code, nickname: 'Dee' })

    expect(playerView(dee)?.round?.joinedAfterStart).toBe(true)
    expect(sheetOf(dee).map((line) => line.verdict)).toEqual([null, null, null])
  })

  it('[slate] gives a reloaded player their own answers back', async () => {
    const { ana, code, roundId } = await openSheets()

    await write({ answer: 'Sel', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'Poivre', itemIndex: 2, player: ana, roundId })
    ana.close()

    const back = await harness.seat({
      code,
      nickname: 'Ana',
      sessionId: sessionIdOf(ana)
    })

    expect(answersOf(back)).toEqual(['Sel', null, 'Poivre'])
  })

  it('[slate] pays a whole group, and follows a verdict changed on an earlier item', async () => {
    const { ana, bo, host, roundId } = await openSheets()

    await write({ answer: 'Paprika', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'le paprika', itemIndex: 0, player: bo, roundId })
    await write({ answer: 'Sel', itemIndex: 1, player: ana, roundId })
    await collect({ host, roundId })

    judge({ groupKey: 'paprika', host, isCorrect: true, itemIndex: 0, roundId })
    await waitFor(() => scoreOf(host, idOf(bo)) === 1, 'the group paid')
    expect(scoreOf(host, idOf(ana))).toBe(1)

    await show({ host, itemIndex: 1, roundId })
    await show({ host, itemIndex: 0, roundId })
    judge({
      groupKey: 'paprika',
      host,
      isCorrect: false,
      itemIndex: 0,
      roundId
    })
    await waitFor(() => scoreOf(host, idOf(ana)) === 0, 'the verdict undone')

    expect(scoreOf(host, idOf(bo))).toBe(0)
    expect(sheetOf(ana).map((line) => line.verdict)).toEqual([
      false,
      false,
      null
    ])
  })

  it('[slate] marks an unjudged answer wrong once the wall moves past it', async () => {
    const { ana, host, roundId } = await openSheets()

    await write({ answer: 'Sel', itemIndex: 0, player: ana, roundId })
    await collect({ host, roundId })

    expect(sheetOf(ana)[0]?.verdict).toBeNull()

    await show({ host, itemIndex: 1, roundId })
    await waitFor(
      () => sheetOf(ana)[0]?.verdict === false,
      'the passed line to be wrong'
    )

    expect(scoreOf(host, idOf(ana))).toBe(0)
  })

  it('[slate] refuses a verdict over a blank or over an item not on the wall', async () => {
    const { ana, bo, host, roundId } = await openSheets()

    await write({ answer: '?!', itemIndex: 0, player: ana, roundId })
    await write({ answer: 'Sel', itemIndex: 1, player: bo, roundId })
    await collect({ host, roundId })

    expect(hostSlateContent(host)?.correction).toEqual({
      blankPlayerIds: [idOf(ana), idOf(bo)],
      groups: []
    })

    judge({ groupKey: '?!', host, isCorrect: true, itemIndex: 0, roundId })
    judge({ groupKey: 'sel', host, isCorrect: true, itemIndex: 1, roundId })
    await waitFor(() => errorsIn(host).length === 2, 'both verdicts refused')

    expect(errorsIn(host).map((error) => error.code)).toEqual([
      'invalid_message',
      'stale_round'
    ])
    expect(scoreOf(host, idOf(ana))).toBe(0)
    expect(scoreOf(host, idOf(bo))).toBe(0)
  })

  it('[slate] adds an item while the sheets are open, and not after', async () => {
    const { ana, host, roundId } = await openSheets()

    host.send({ roundId, type: 'host.addItem' })
    await waitFor(
      () => slateRound(playerView(ana))?.itemCount === 4,
      'the fourth item'
    )
    await write({ answer: 'Ail', itemIndex: 3, player: ana, roundId })
    await collect({ host, roundId })
    host.send({ roundId, type: 'host.addItem' })
    await waitFor(() => errorsIn(host).length > 0, 'the late item refused')

    expect(errorsIn(host).map((error) => error.code)).toEqual(['wrong_phase'])
    expect(hostSlateContent(host)?.keys).toHaveLength(4)
  })

  // The host holds the key and marks the sheets, so a seat would be a sheet
  // filled in from the answers.
  it('[slate] gives the console no seat', async () => {
    const { host } = await harness.openRoom(SLATE, 'Console')

    await waitFor(
      () => hostView(host)?.settings.game?.kind === 'slate',
      'the slate to be set'
    )

    expect(hostView(host)?.youId).toBeNull()
    expect(hostView(host)?.players).toEqual([])
  })

  it('[slate] ends the round only from the correction', async () => {
    const { ana, host, roundId } = await openSheets()

    host.send({ roundId, type: 'host.reveal' })
    await waitFor(() => errorsIn(host).length > 0, 'the early reveal refused')

    expect(errorsIn(host).map((error) => error.code)).toEqual(['wrong_phase'])
    expect(playerView(ana)?.phase).toBe('playing')
    expect(hostRoundIdOf(host)).toBe(roundId)
  })
})
