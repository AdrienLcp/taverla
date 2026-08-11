import { describe, expect, it } from 'vitest'

import { gameKinds } from '@taverla/protocol/game'

import { offersAnswerMode } from './game-modes'
import { roomSettingsFor } from './room-settings'

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
