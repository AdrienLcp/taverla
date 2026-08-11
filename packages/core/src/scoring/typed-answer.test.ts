import { describe, expect, it } from 'vitest'

import {
  gradeGuess,
  hasBothHalves,
  NOTHING_BANKED,
  pointsForTypedAnswer,
  withGuessBanked
} from './typed-answer'

const TRACK = { artist: 'Daft Punk', title: 'Harder, Better, Faster, Stronger' }

describe('gradeGuess', () => {
  it('[typed] banks whichever half the guess is, without being told which', () => {
    expect(gradeGuess({ guess: 'daft punk', track: TRACK })).toEqual({
      artistCorrect: true,
      titleCorrect: false
    })

    expect(
      gradeGuess({ guess: 'harder better faster stronger', track: TRACK })
    ).toEqual({ artistCorrect: false, titleCorrect: true })
  })

  // The cost of one field, pinned rather than discovered in a room: whole
  // strings are compared, so a line holding both halves is neither of them.
  // It is why the field asks for one thing at a time.
  it('[typed] matches neither half when a guess runs the two together', () => {
    expect(
      gradeGuess({
        guess: 'harder better faster stronger daft punk',
        track: TRACK
      })
    ).toEqual({ artistCorrect: false, titleCorrect: false })
  })

  it('[typed] forgives a slipped finger, as the matcher does everywhere', () => {
    expect(
      gradeGuess({ guess: 'harder better faster strongr', track: TRACK })
        .titleCorrect
    ).toBe(true)
  })
})

describe('withGuessBanked', () => {
  it('[typed] keeps a half already won when the next guess misses', () => {
    const banked = withGuessBanked({
      banked: NOTHING_BANKED,
      guessed: gradeGuess({ guess: 'daft punk', track: TRACK })
    })

    const after = withGuessBanked({
      banked,
      guessed: gradeGuess({ guess: 'around the world', track: TRACK })
    })

    expect(after).toEqual({ artistCorrect: true, titleCorrect: false })
    expect(hasBothHalves(after)).toBe(false)
  })

  it('[typed] pays the pair the same whether it took one guess or two', () => {
    const acrossTwo = withGuessBanked({
      banked: gradeGuess({ guess: 'daft punk', track: TRACK }),
      guessed: gradeGuess({
        guess: 'harder better faster stronger',
        track: TRACK
      })
    })

    expect(hasBothHalves(acrossTwo)).toBe(true)
    expect(pointsForTypedAnswer(acrossTwo)).toBe(3)
  })
})
