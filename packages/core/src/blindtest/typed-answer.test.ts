import { describe, expect, it } from 'vitest'

import { POINTS_FOR_A_TYPED_ANSWER } from '@taverla/protocol/scoring'

import { isFullyBanked, pointsForSimultaneousAnswer } from '../scoring/verdict'
import {
  cueOf,
  gradeGuess,
  NOTHING_BANKED,
  withGuessBanked
} from './typed-answer'

const TRACK = {
  artist: 'Daft Punk',
  film: null,
  title: 'Harder, Better, Faster, Stronger'
}

const SCORE_CUE = {
  artist: 'Hans Zimmer',
  film: 'Interstellar',
  title: 'Cornfield Chase'
}

describe('gradeGuess', () => {
  // Nobody at the table has ever heard the words `Cornfield Chase`, and
  // everybody shouts *Interstellar*. Where the catalogue named a film, the film
  // is what the half is measured against — the cue is not an answer.
  it('[film] measures the half against the film, never the cue', () => {
    expect(gradeGuess({ guess: 'interstellar', track: SCORE_CUE })).toEqual({
      artistCorrect: false,
      kind: 'halves',
      titleCorrect: true
    })

    expect(gradeGuess({ guess: 'cornfield chase', track: SCORE_CUE })).toEqual({
      artistCorrect: false,
      kind: 'halves',
      titleCorrect: false
    })

    expect(
      gradeGuess({ guess: 'interstellar hans zimmer', track: SCORE_CUE })
    ).toEqual({ artistCorrect: true, kind: 'halves', titleCorrect: true })
  })

  it('[typed] banks whichever half the guess is, without being told which', () => {
    expect(gradeGuess({ guess: 'daft punk', track: TRACK })).toEqual({
      artistCorrect: true,
      kind: 'halves',
      titleCorrect: false
    })

    expect(
      gradeGuess({ guess: 'harder better faster stronger', track: TRACK })
    ).toEqual({ artistCorrect: false, kind: 'halves', titleCorrect: true })
  })

  // What a room actually types into one field: both halves on one line, in
  // whichever order, with nothing marking where one ends.
  it('[typed] finds both halves when a guess runs the two together', () => {
    expect(
      gradeGuess({
        guess: 'harder better faster stronger daft punk',
        track: TRACK
      })
    ).toEqual({ artistCorrect: true, kind: 'halves', titleCorrect: true })

    expect(
      gradeGuess({
        guess: 'daft punk harder better faster stronger',
        track: TRACK
      })
    ).toEqual({ artistCorrect: true, kind: 'halves', titleCorrect: true })
  })

  // The half they got, and the half they still owe. A line that is right about
  // one thing and wrong about the other must not be all-or-nothing.
  it('[typed] banks the right half of a line that is half wrong', () => {
    expect(
      gradeGuess({
        guess: 'the chemical brothers harder better faster stronger',
        track: TRACK
      })
    ).toEqual({ artistCorrect: false, kind: 'halves', titleCorrect: true })
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

    expect(after).toEqual({
      artistCorrect: true,
      kind: 'halves',
      titleCorrect: false
    })
    expect(isFullyBanked(after)).toBe(false)
  })

  it('[typed] pays the pair the same whether it took one guess or two', () => {
    const acrossTwo = withGuessBanked({
      banked: gradeGuess({ guess: 'daft punk', track: TRACK }),
      guessed: gradeGuess({
        guess: 'harder better faster stronger',
        track: TRACK
      })
    })

    expect(isFullyBanked(acrossTwo)).toBe(true)
    expect(
      pointsForSimultaneousAnswer({ mode: 'typed', verdict: acrossTwo })
    ).toBe(POINTS_FOR_A_TYPED_ANSWER)
  })
})

describe('cueOf', () => {
  it('[film] drops the film the catalogue wrote into the cue', () => {
    expect(
      cueOf({
        artist: 'Alan Silvestri',
        film: 'Forrest Gump',
        title: 'They’re Sending Me To Vietnam (From "Forrest Gump" Score)'
      })
    ).toBe('They’re Sending Me To Vietnam')
  })

  it('[film] says nothing where the cue is the film again', () => {
    expect(
      cueOf({ artist: 'Éric Serra', film: 'Subway', title: 'Subway' })
    ).toBeNull()
  })

  it('[film] says nothing on a track that is not from a film', () => {
    expect(
      cueOf({ artist: 'Daft Punk', film: null, title: 'One More Time' })
    ).toBeNull()
  })
})
