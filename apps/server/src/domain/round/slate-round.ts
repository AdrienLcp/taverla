import { Result } from '@adrienlcp/result'

import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { SlateSettings } from '@taverla/protocol/game'
import type { PlayerId, RoundId } from '@taverla/protocol/identifiers'
import { MAX_SLATE_ITEMS } from '@taverla/protocol/slate'

import {
  type AnswerGroup,
  groupAnswers,
  isBlankAnswer
} from '@taverla/core/slate/answer-groups'
import { sheetPoints, UNMARKED_ITEM } from '@taverla/core/slate/sheet-marking'

import type { Room, Round } from '@/domain/room/room'
import { touch } from '@/domain/room/room-service'

type SlateContent = Extract<Round['content'], { kind: 'slate' }>

export type SlateRejection = Extract<
  ProtocolErrorCode,
  'invalid_message' | 'stale_round' | 'wrong_phase'
>

/** The slate's half of opening a round: a blank sheet as long as the setting says. */
export const slateContent = (settings: SlateSettings): Round['content'] => ({
  currentItemIndex: null,
  itemCount: settings.itemCount,
  keys: new Map(),
  kind: 'slate',
  markings: [],
  sheets: new Map()
})

const slateRoundIn = ({
  room,
  roundId
}: {
  room: Room
  roundId: RoundId
}): Result<{ content: SlateContent; round: Round }, SlateRejection> => {
  const round = room.round

  if (round === null || round.content.kind !== 'slate') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  return Result.success({ content: round.content, round })
}

/**
 * Who is marked: the players stamped at collection who still hold a seat. A
 * sheet whose writer left is not marked, and nobody is left to be paid for it.
 */
export const markedPlayerIds = (room: Room): PlayerId[] => {
  const stamped = room.round?.openedWithPlayerIds ?? null

  return stamped === null
    ? []
    : [...room.players.keys()].filter((playerId) => stamped.has(playerId))
}

export const writeSlateLine = ({
  answer,
  itemIndex,
  now,
  playerId,
  room,
  roundId
}: {
  answer: string
  itemIndex: number
  now: number
  playerId: PlayerId
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  const { content } = found.data

  if (itemIndex >= content.itemCount) {
    return Result.failure('invalid_message')
  }

  const sheet = content.sheets.get(playerId) ?? new Map<number, string>()

  if (answer === '') {
    sheet.delete(itemIndex)
  } else {
    sheet.set(itemIndex, answer)
  }

  content.sheets.set(playerId, sheet)
  touch(room, now)

  return Result.success()
}

export const addSlateItem = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  if (found.data.content.itemCount >= MAX_SLATE_ITEMS) {
    return Result.failure('invalid_message')
  }

  found.data.content.itemCount += 1
  touch(room, now)

  return Result.success()
}

/**
 * Open for as long as the round is: a host notes a key while the room writes
 * and may still fix a typo in one on the wall. Only the reveal closes it.
 */
export const setSlateKey = ({
  itemIndex,
  key,
  now,
  room,
  roundId
}: {
  itemIndex: number
  key: string
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (found.data.round.revealed) {
    return Result.failure('wrong_phase')
  }

  const { content } = found.data

  if (itemIndex >= content.itemCount) {
    return Result.failure('invalid_message')
  }

  if (key === '') {
    content.keys.delete(itemIndex)
  } else {
    content.keys.set(itemIndex, key)
  }

  touch(room, now)

  return Result.success()
}

/**
 * The sheets go read-only and the wall opens on the first item. This is the
 * slate's stamp: whoever holds a seat now is marked, and anybody arriving
 * after is the shell's latecomer.
 */
export const collectSheets = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  const { content, round } = found.data

  round.openedWithPlayerIds = new Set(room.players.keys())
  content.markings = Array.from({ length: content.itemCount }, () => ({
    ...UNMARKED_ITEM
  }))
  content.currentItemIndex = 0
  room.phase = 'correcting'
  touch(room, now)

  return Result.success()
}

/**
 * Moves the wall to another item, and passes the one it leaves: from then on
 * an answer there that nobody validated is wrong. Going back is allowed, and a
 * passed item stays passed — what changes on a revisit is a verdict.
 */
export const showSlateItem = ({
  itemIndex,
  now,
  room,
  roundId
}: {
  itemIndex: number
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (room.phase !== 'correcting') {
    return Result.failure('wrong_phase')
  }

  const { content, round } = found.data

  if (itemIndex >= content.itemCount) {
    return Result.failure('invalid_message')
  }

  passCurrentItem(content)
  content.currentItemIndex = itemIndex
  rescoreSheets({ content, room, round })
  touch(room, now)

  return Result.success()
}

/**
 * One verdict over a whole group of the item on the wall. It is paid or
 * unpaid on the spot, because a verdict can be taken back and the running
 * scores are on screen.
 *
 * A blank is no group, so no verdict can name one — which is the whole of the
 * guard against validating an empty line.
 */
export const judgeSlateGroup = ({
  groupKey,
  isCorrect,
  itemIndex,
  now,
  room,
  roundId
}: {
  groupKey: string
  isCorrect: boolean
  itemIndex: number
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  if (room.phase !== 'correcting') {
    return Result.failure('wrong_phase')
  }

  const { content, round } = found.data
  const marking = content.markings[itemIndex]

  // The wall has moved on since the tap was made, the way a stale round id
  // means the round has.
  if (itemIndex !== content.currentItemIndex || marking === undefined) {
    return Result.failure('stale_round')
  }

  const judgeable = answerGroupsFor({ itemIndex, room }).some(
    (group) => group.key === groupKey
  )

  if (!judgeable) {
    return Result.failure('invalid_message')
  }

  content.markings[itemIndex] = {
    judged: new Map(marking.judged).set(groupKey, isCorrect),
    passed: marking.passed
  }
  rescoreSheets({ content, room, round })
  touch(room, now)

  return Result.success()
}

/** Everything left unvalidated is wrong now; the round is about to be revealed. */
export const markEveryItem = (room: Room): void => {
  const round = room.round

  if (round === null || round.content.kind !== 'slate') {
    return
  }

  round.content.markings = round.content.markings.map((marking) => ({
    ...marking,
    passed: true
  }))
  rescoreSheets({ content: round.content, room, round })
}

/** The item's non-blank answers, grouped, from the sheets being marked. */
export const answerGroupsFor = ({
  itemIndex,
  room
}: {
  itemIndex: number
  room: Room
}): AnswerGroup[] => {
  const content = room.round?.content

  if (content?.kind !== 'slate') {
    return []
  }

  return groupAnswers(
    markedPlayerIds(room).flatMap((playerId) => {
      const text = content.sheets.get(playerId)?.get(itemIndex)

      return text === undefined ? [] : [{ playerId, text }]
    })
  )
}

/** Who has nothing a group could hold on this item. */
export const blankPlayerIdsFor = ({
  itemIndex,
  room
}: {
  itemIndex: number
  room: Room
}): PlayerId[] => {
  const content = room.round?.content

  if (content?.kind !== 'slate') {
    return []
  }

  return markedPlayerIds(room).filter((playerId) =>
    isBlankAnswer(content.sheets.get(playerId)?.get(itemIndex) ?? null)
  )
}

const passCurrentItem = (content: SlateContent): void => {
  const current = content.currentItemIndex
  const marking = current === null ? undefined : content.markings[current]

  if (current === null || marking === undefined) {
    return
  }

  content.markings[current] = { ...marking, passed: true }
}

/**
 * Recomputed from every verdict rather than added to, because a verdict can be
 * taken back: each score moves by the difference from what the round had
 * already paid that player.
 */
const rescoreSheets = ({
  content,
  room,
  round
}: {
  content: SlateContent
  room: Room
  round: Round
}): void => {
  round.awards = markedPlayerIds(room).map((playerId) => {
    const points = sheetPoints({
      markings: content.markings,
      sheet: content.sheets.get(playerId) ?? new Map()
    })
    const paid =
      round.awards.find((award) => award.playerId === playerId)?.points ?? 0
    const participant = room.players.get(playerId)

    if (participant !== undefined) {
      participant.score += points - paid
    }

    return {
      playerId,
      points,
      speedBonus: 0,
      verdict: { isCorrect: points > 0, kind: 'single' }
    }
  })
}
