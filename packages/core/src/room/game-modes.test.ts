import { describe, expect, it } from 'vitest'

import { gameKinds } from '@taverla/protocol/game'

import {
  answerModeForGame,
  answerModesFor,
  offersAnswerMode
} from './game-modes'

describe('answerModesFor', () => {
  it('[game-modes] narrows the bare buzzer to the one mode it can serve', () => {
    expect(answerModesFor('buzzer')).toEqual(['buzzer'])
  })

  it('[game-modes] leaves every mode to a game that serves a stimulus', () => {
    expect(answerModesFor('blindtest')).toEqual(['buzzer', 'choice', 'typed'])
  })

  // A game offering nothing is a lobby whose start button opens a round the
  // server then refuses, which is the least legible way for this to go wrong.
  it('[game-modes] offers at least one mode for every game on the shelf', () => {
    for (const game of gameKinds) {
      expect(answerModesFor(game).length).toBeGreaterThan(0)
    }
  })
})

describe('offersAnswerMode', () => {
  it('[game-modes] refuses a typed field to a game with nothing to type against', () => {
    expect(offersAnswerMode({ answerMode: 'typed', game: 'buzzer' })).toBe(
      false
    )
    expect(offersAnswerMode({ answerMode: 'buzzer', game: 'buzzer' })).toBe(
      true
    )
  })
})

describe('answerModeForGame', () => {
  it('[game-modes] keeps a mode the game being switched to also offers', () => {
    expect(answerModeForGame({ answerMode: 'typed', game: 'quiz' })).toBe(
      'typed'
    )
  })

  it('[game-modes] falls back to the only mode the new game offers', () => {
    expect(answerModeForGame({ answerMode: 'typed', game: 'buzzer' })).toBe(
      'buzzer'
    )
  })
})
