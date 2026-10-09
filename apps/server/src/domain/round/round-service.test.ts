import { describe, expect, it } from 'vitest'

import type { GameKind } from '@taverla/protocol/game'

import { generateHostToken } from '@taverla/core/room/host-token'

import { newRoom } from '@/domain/room/new-room'

import {
  advanceDueAt,
  openRound,
  revealRound,
  TRACK_DRAW_LEAD_MS
} from './round-service'

const OPENED_AT = 1_000_000
const COUNTDOWN_MS = 3_000
const HOLD_MS = 8_000
const REVEALED_AT = OPENED_AT + 20_000

const revealedRoom = ({
  game,
  roundCount
}: {
  game: Extract<GameKind, 'blindtest' | 'buzzer'>
  roundCount: number | null
}) => {
  const room = newRoom({
    code: 'ABCD',
    game,
    hostToken: generateHostToken(),
    locale: 'fr',
    now: OPENED_AT
  })

  room.settings.countdownMs = COUNTDOWN_MS
  room.settings.autoAdvanceMs = HOLD_MS
  room.settings.roundCount = roundCount

  openRound({
    content:
      game === 'buzzer'
        ? { kind: 'buzzer' }
        : {
            choices: [],
            correctChoiceIndex: null,
            kind: 'blindtest',
            track: {
              artist: 'Daft Punk',
              coverUrl: null,
              film: null,
              id: '1',
              previewUrl: 'https://preview.test/1.mp3',
              title: 'Around the World'
            }
          },
    id: 'round-1',
    now: OPENED_AT,
    room
  })
  revealRound(room, REVEALED_AT)

  return room
}

describe('advanceDueAt', () => {
  it('[hold] wakes a blind test a countdown and a track draw before its next clip', () => {
    const room = revealedRoom({ game: 'blindtest', roundCount: 10 })

    expect(advanceDueAt(room)).toBe(
      REVEALED_AT + HOLD_MS - COUNTDOWN_MS - TRACK_DRAW_LEAD_MS
    )
  })

  it('[hold] wakes a game with nothing to draw a countdown before its next start, and no earlier', () => {
    const room = revealedRoom({ game: 'buzzer', roundCount: 10 })

    expect(advanceDueAt(room)).toBe(REVEALED_AT + HOLD_MS - COUNTDOWN_MS)
  })

  it('[hold] ends the final round when the hold itself runs out', () => {
    const room = revealedRoom({ game: 'blindtest', roundCount: 1 })

    expect(advanceDueAt(room)).toBe(REVEALED_AT + HOLD_MS)
  })

  it('[hold] never treats a room with no round count as on its final round', () => {
    const room = revealedRoom({ game: 'blindtest', roundCount: null })

    expect(advanceDueAt(room)).toBe(
      REVEALED_AT + HOLD_MS - COUNTDOWN_MS - TRACK_DRAW_LEAD_MS
    )
  })

  it('[hold] asks for nothing when the reveal waits for the host', () => {
    const room = revealedRoom({ game: 'blindtest', roundCount: 10 })

    if (room.round !== null) {
      room.round.advancesAt = null
    }

    expect(advanceDueAt(room)).toBeNull()
  })
})
