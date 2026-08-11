import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BLINDTEST_SETTINGS,
  DEFAULT_BUZZER_SETTINGS,
  gameKinds
} from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'

import { offersAnswerMode } from './game-modes'
import { reshapesRound, roomSettingsFor } from './room-settings'

describe('roomSettingsFor', () => {
  it('[room-settings] opens a room on the game it was created for', () => {
    expect(roomSettingsFor('buzzer').game.kind).toBe('buzzer')
  })

  // The pair travels together everywhere, and a room that opened on a mode its
  // own game refuses is one whose first "start" the server rejects.
  it('[room-settings] never opens a room on a mode its game does not offer', () => {
    for (const game of gameKinds) {
      const settings = roomSettingsFor(game)

      expect(offersAnswerMode({ answerMode: settings.answerMode, game })).toBe(
        true
      )
    }
  })

  it('[room-settings] leaves a game with no natural end running until the host stops it', () => {
    expect(roomSettingsFor('buzzer').roundCount).toBeNull()
    expect(roomSettingsFor('blindtest').roundCount).toBe(10)
  })
})

describe('reshapesRound', () => {
  const blindtest: RoomSettings = {
    ...roomSettingsFor('blindtest'),
    game: DEFAULT_BLINDTEST_SETTINGS
  }
  const buzzer: RoomSettings = {
    ...roomSettingsFor('buzzer'),
    game: DEFAULT_BUZZER_SETTINGS
  }

  it('[room-settings] lets everything a round only reads later through', () => {
    expect(
      reshapesRound({
        from: blindtest,
        to: {
          ...blindtest,
          answerWindowMs: 5_000,
          autoAdvanceMs: 8_000,
          countdownMs: 10_000,
          roundCount: null
        }
      })
    ).toBe(false)
  })

  it('[room-settings] lets a game setting the round does not stand on through', () => {
    expect(
      reshapesRound({
        from: blindtest,
        to: {
          ...blindtest,
          game: {
            ...DEFAULT_BLINDTEST_SETTINGS,
            difficulty: 'obscure',
            source: { kind: 'search', query: 'yacht rock' }
          }
        }
      })
    ).toBe(false)
  })

  it('[room-settings] stops the mode a round is scored by', () => {
    expect(
      reshapesRound({
        from: blindtest,
        to: { ...blindtest, answerMode: 'choice' }
      })
    ).toBe(true)
  })

  it('[room-settings] stops the game the content is an arm of', () => {
    expect(reshapesRound({ from: blindtest, to: buzzer })).toBe(true)
  })

  it('[room-settings] stops the clock the round runs on', () => {
    expect(
      reshapesRound({
        from: blindtest,
        to: {
          ...blindtest,
          game: { ...DEFAULT_BLINDTEST_SETTINGS, roundDurationMs: 10_000 }
        }
      })
    ).toBe(true)
  })

  // The bare buzzer's round has no clock at all, so both sides read `null` —
  // a comparison that would call every one of its rounds reshaped if the
  // absent duration were read as a difference.
  it('[room-settings] lets the lockout switch through on a game with no clock', () => {
    expect(
      reshapesRound({
        from: buzzer,
        to: {
          ...buzzer,
          game: { ...DEFAULT_BUZZER_SETTINGS, locksOutOnMiss: false }
        }
      })
    ).toBe(false)
  })
})
