import { describe, expect, it } from 'vitest'

import { gameKinds } from '@taverla/protocol/game'
import { DEFAULT_MODE_SETTINGS } from '@taverla/protocol/room'

import {
  answerModesFor,
  isJudgedByHost,
  modeOfferedBy,
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
    expect(offersAnswerMode({ game: 'buzzer', mode: 'typed' })).toBe(false)
    expect(offersAnswerMode({ game: 'buzzer', mode: 'buzzer' })).toBe(true)
  })
})

describe('isJudgedByHost', () => {
  it('[game-modes] leaves the reflex race to settle on its own taps', () => {
    expect(isJudgedByHost({ game: 'reflex', mode: 'buzzer' })).toBe(false)
  })

  it('[game-modes] keeps a bare buzzer’s host reading the answer', () => {
    expect(isJudgedByHost({ game: 'buzzer', mode: 'buzzer' })).toBe(true)
  })

  // The mode is what asks for a judge, so the same game answers differently
  // depending on how the room decided to answer it.
  it('[game-modes] asks for no judge where the server grades', () => {
    expect(isJudgedByHost({ game: 'blindtest', mode: 'typed' })).toBe(false)
    expect(isJudgedByHost({ game: 'blindtest', mode: 'buzzer' })).toBe(true)
  })

  it('[game-modes] withholds the seat from a room that has picked nothing yet', () => {
    expect(isJudgedByHost({ game: null, mode: 'buzzer' })).toBe(true)
  })
})

describe('modeOfferedBy', () => {
  it('[game-modes] serves the preference a game offers', () => {
    expect(
      modeOfferedBy({ game: 'quiz', preferred: DEFAULT_MODE_SETTINGS.typed })
    ).toEqual({ kind: 'typed' })
  })

  it('[game-modes] falls back to the only mode a bare buzzer offers', () => {
    expect(
      modeOfferedBy({ game: 'buzzer', preferred: DEFAULT_MODE_SETTINGS.typed })
    ).toEqual({ answerWindowMs: 10_000, kind: 'buzzer' })
  })

  // The kind is what a game gets a say in; the floor a host set to "you decide"
  // is theirs, and comes through with it.
  it('[game-modes] carries a served mode’s own settings through untouched', () => {
    expect(
      modeOfferedBy({
        game: 'blindtest',
        preferred: { answerWindowMs: null, kind: 'buzzer' }
      })
    ).toEqual({ answerWindowMs: null, kind: 'buzzer' })
  })
})
