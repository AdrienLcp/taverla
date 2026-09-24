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
import {
  closedItem,
  OPEN_ITEM,
  type SheetItem,
  sheetPoints
} from '@taverla/core/slate/sheet-marking'

import type { Room, Round } from '@/domain/room/room'
import { touch } from '@/domain/room/room-service'

type SlateContent = Extract<Round['content'], { kind: 'slate' }>

type SlateRound = { content: SlateContent; round: Round }

export type SlateRejection = Extract<
  ProtocolErrorCode,
  'invalid_message' | 'stale_round' | 'wrong_phase'
>

/**
 * The slate's half of opening a round: a blank sheet as long as the setting
 * says, every item open, and whatever key the host prepared. A key past the
 * sheet waits there until `host.addItem` grows the sheet to it, the way a
 * label does.
 */
export const slateContent = ({
  keys,
  settings
}: {
  keys: readonly (string | null)[]
  settings: SlateSettings
}): Round['content'] => ({
  currentItemIndex: null,
  items: Array.from({ length: settings.itemCount }, () => OPEN_ITEM),
  keys: new Map(
    keys.flatMap((key, index) =>
      key === null || key === '' ? [] : [[index, key] as const]
    )
  ),
  kind: 'slate',
  revealedKeyIndexes: new Set(),
  sheets: new Map()
})

const slateRoundIn = ({
  room,
  roundId
}: {
  room: Room
  roundId: RoundId
}): Result<SlateRound, SlateRejection> => {
  const round = room.round

  if (round === null || round.content.kind !== 'slate') {
    return Result.failure('wrong_phase')
  }

  if (round.id !== roundId) {
    return Result.failure('stale_round')
  }

  return Result.success({ content: round.content, round })
}

/** Writing and marking share `playing`: nothing is written before it, and nothing moves after the reveal. */
const liveSlateRoundIn = ({
  room,
  roundId
}: {
  room: Room
  roundId: RoundId
}): Result<SlateRound, SlateRejection> => {
  const found = slateRoundIn({ room, roundId })

  if (found.status === 'success' && room.phase !== 'playing') {
    return Result.failure('wrong_phase')
  }

  return found
}

/**
 * Who is marked on one item: the players seated when it closed who still hold
 * a seat. A sheet whose writer left is not marked, and nobody is left to be
 * paid for it.
 */
const markedOn = ({
  item,
  room
}: {
  item: SheetItem
  room: Room
}): PlayerId[] =>
  item.state === 'closed'
    ? [...room.players.keys()].filter((playerId) => item.roster.has(playerId))
    : []

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
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content } = found.data
  const item = content.items[itemIndex]

  if (item === undefined) {
    return Result.failure('invalid_message')
  }

  if (item.state !== 'open') {
    return Result.failure('wrong_phase')
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

/** Open until the reveal: an item added after every other has closed reopens the sheet for it. */
export const addSlateItem = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content, round } = found.data

  if (content.items.length >= MAX_SLATE_ITEMS) {
    return Result.failure('invalid_message')
  }

  content.items.push(OPEN_ITEM)
  stampRound({ content, round })
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

  if (itemIndex >= content.items.length) {
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
 * The key of one closed item, up on the wall and on every sheet. An open item
 * is refused: its key would be an answer somebody can still write down.
 */
export const revealSlateKey = ({
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
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content } = found.data
  const item = content.items[itemIndex]

  if (item === undefined || !content.keys.has(itemIndex)) {
    return Result.failure('invalid_message')
  }

  if (item.state === 'open') {
    return Result.failure('wrong_phase')
  }

  content.revealedKeyIndexes.add(itemIndex)
  touch(room, now)

  return Result.success()
}

/**
 * One item goes read-only on every sheet and onto the wall. This is the item's
 * stamp: whoever holds a seat now is marked on it, and anybody arriving after
 * was never asked it — but is still owed every item left open.
 */
export const closeSlateItem = ({
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
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content, round } = found.data
  const item = content.items[itemIndex]

  if (item === undefined) {
    return Result.failure('invalid_message')
  }

  if (item.state !== 'open') {
    return Result.failure('wrong_phase')
  }

  content.items[itemIndex] = closedItem(new Set(room.players.keys()))
  moveWall({ content, itemIndex })
  settle({ content, room, round })
  touch(room, now)

  return Result.success()
}

/** Every item still open closes on one stamp, and the wall moves to the first of them. */
export const collectSheets = ({
  now,
  room,
  roundId
}: {
  now: number
  room: Room
  roundId: RoundId
}): Result<void, SlateRejection> => {
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content, round } = found.data
  const firstOpen = content.items.findIndex((item) => item.state === 'open')

  if (firstOpen === -1) {
    return Result.failure('wrong_phase')
  }

  closeOpenItems({ content, room })
  moveWall({ content, itemIndex: firstOpen })
  settle({ content, room, round })
  touch(room, now)

  return Result.success()
}

/**
 * Moves the wall to a closed item, and passes the one it leaves: from then on
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
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content, round } = found.data
  const item = content.items[itemIndex]

  if (item === undefined) {
    return Result.failure('invalid_message')
  }

  if (item.state !== 'closed') {
    return Result.failure('wrong_phase')
  }

  moveWall({ content, itemIndex })
  settle({ content, room, round })
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
  const found = liveSlateRoundIn({ room, roundId })

  if (found.status === 'failure') {
    return found
  }

  const { content, round } = found.data
  const item = content.items[itemIndex]

  // The wall has moved on since the tap was made, the way a stale round id
  // means the round has.
  if (itemIndex !== content.currentItemIndex || item?.state !== 'closed') {
    return Result.failure('stale_round')
  }

  const judgeable = answerGroupsFor({ itemIndex, room }).some(
    (group) => group.key === groupKey
  )

  if (!judgeable) {
    return Result.failure('invalid_message')
  }

  content.items[itemIndex] = {
    ...item,
    marking: {
      judged: new Map(item.marking.judged).set(groupKey, isCorrect),
      passed: item.marking.passed
    }
  }
  settle({ content, room, round })
  touch(room, now)

  return Result.success()
}

/**
 * Whether the host may end the sheet. An item never closed would be revealed
 * without anybody having seen its answers, so the reveal waits for them all.
 */
export const isSheetClosed = (room: Room): boolean =>
  room.round?.content.kind === 'slate' &&
  room.round.content.items.every((item) => item.state !== 'open')

/**
 * The round is being revealed, or the game ended under it: anything still open
 * closes, and everything left unvalidated is wrong now.
 */
export const markEveryItem = (room: Room): void => {
  const round = room.round

  if (round === null || round.content.kind !== 'slate') {
    return
  }

  const content = round.content

  closeOpenItems({ content, room })
  content.items = content.items.map((item) =>
    item.state === 'closed'
      ? { ...item, marking: { ...item.marking, passed: true } }
      : item
  )
  settle({ content, room, round })
}

/** The item's non-blank answers, grouped — and none while it is open, which is the wall's privacy. */
export const answerGroupsFor = ({
  itemIndex,
  room
}: {
  itemIndex: number
  room: Room
}): AnswerGroup[] => {
  const content = room.round?.content
  const item = content?.kind === 'slate' ? content.items[itemIndex] : undefined

  if (content?.kind !== 'slate' || item === undefined) {
    return []
  }

  return groupAnswers(
    markedOn({ item, room }).flatMap((playerId) => {
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
  const item = content?.kind === 'slate' ? content.items[itemIndex] : undefined

  if (content?.kind !== 'slate' || item === undefined) {
    return []
  }

  return markedOn({ item, room }).filter((playerId) =>
    isBlankAnswer(content.sheets.get(playerId)?.get(itemIndex) ?? null)
  )
}

const closeOpenItems = ({
  content,
  room
}: {
  content: SlateContent
  room: Room
}): void => {
  const roster = new Set(room.players.keys())

  content.items = content.items.map((item) =>
    item.state === 'open' ? closedItem(roster) : item
  )
}

const moveWall = ({
  content,
  itemIndex
}: {
  content: SlateContent
  itemIndex: number
}): void => {
  const current = content.currentItemIndex
  const leaving = current === null ? undefined : content.items[current]

  if (current !== null && leaving?.state === 'closed') {
    content.items[current] = {
      ...leaving,
      marking: { ...leaving.marking, passed: true }
    }
  }

  content.currentItemIndex = itemIndex
}

const settle = ({
  content,
  room,
  round
}: SlateRound & { room: Room }): void => {
  stampRound({ content, round })
  rescoreSheets({ content, room, round })
}

/**
 * The shell's latecomer rule at the sheet's scale: nobody arrives late while
 * there is still an item to write. Once none is open, a seat is late unless
 * some item closed on it.
 */
const stampRound = ({ content, round }: SlateRound): void => {
  round.openedWithPlayerIds = content.items.some(
    (item) => item.state === 'open'
  )
    ? null
    : new Set(
        content.items.flatMap((item) =>
          item.state === 'closed' ? [...item.roster] : []
        )
      )
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
}: SlateRound & { room: Room }): void => {
  const marked = new Set(
    content.items.flatMap((item) => markedOn({ item, room }))
  )

  round.awards = [...room.players.keys()]
    .filter((playerId) => marked.has(playerId))
    .map((playerId) => {
      const points = sheetPoints({
        items: content.items,
        playerId,
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
