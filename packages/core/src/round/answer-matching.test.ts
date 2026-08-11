import { describe, expect, it } from 'vitest'

import {
  answerAppearsIn,
  matchesAnswer,
  normalizeAnswer
} from './answer-matching'

/**
 * The table is the threshold's defence, so both halves matter: the near-misses
 * a real room produces must pass, and the short wrong answers that sit one
 * correction away from right must not. Losing either half is how a tolerance
 * quietly becomes "anything matches".
 */
const ACCEPTED: [expected: string, given: string, why: string][] = [
  ['Ella, elle l’a', 'ella elle la', 'apostrophes and commas'],
  ['Ella, elle l’a (Remasterisé en 2004)', 'ella elle la', 'catalogue noise'],
  ['Où sont les femmes ?', 'ou sont les femmes', 'accents'],
  ['Daft Punk', 'daftpunk', 'a missing space'],
  ['Get Lucky (feat. Pharrell Williams)', 'get lucky', 'a featuring credit'],
  ['Wake Me Up - Radio Edit', 'wake me up', 'a dashed suffix'],
  ['Bohemian Rhapsody', 'bohemian rapsody', 'one slipped finger'],
  ['Imagine', 'imagin', 'a truncation on a short title'],
  ['Jean-Jacques Goldman', 'jean jacques goldman', 'a hyphen typed as a space']
]

const REFUSED: [expected: string, given: string, why: string][] = [
  ['Love', 'live', 'one correction on four characters'],
  ['Help', 'hell', 'the same, and rude'],
  ['Queen', 'green', 'one correction on five'],
  ['Yesterday', 'yesterda i think', 'padding around a right answer'],
  ['Thriller', 'chandelier', 'a different song of a similar length'],
  ['Bohemian Rhapsody', 'bohemian rap', 'half a title'],
  [
    'Bohemian Rhapsody',
    'bohemien rapsodie',
    'a phonetic respelling — four corrections is a rewrite, not a typo'
  ],
  ['Sexy Boy', '', 'nothing at all'],
  ['Sexy Boy', '   ', 'whitespace pretending to be an answer']
]

describe('normalizeAnswer', () => {
  it('[matching] folds an answer to what the player actually knew', () => {
    expect(normalizeAnswer('Ella, elle l’a (Remasterisé en 2004)')).toBe(
      'ellaellela'
    )
  })

  it('[matching] keeps a hyphenated word whole', () => {
    expect(normalizeAnswer('Jean-Jacques')).toBe('jeanjacques')
  })

  it('[matching] drops a dashed suffix but not a dash inside a word', () => {
    expect(normalizeAnswer('Sunday Bloody Sunday - Live')).toBe(
      'sundaybloodysunday'
    )
  })
})

describe('matchesAnswer', () => {
  for (const [expected, given, why] of ACCEPTED) {
    it(`[matching] accepts ${why}`, () => {
      expect(matchesAnswer({ expected, given })).toBe(true)
    })
  }

  for (const [expected, given, why] of REFUSED) {
    it(`[matching] refuses ${why}`, () => {
      expect(matchesAnswer({ expected, given })).toBe(false)
    })
  }
})

/**
 * One field takes one line, and a room puts both halves on it. Everything
 * `matchesAnswer` accepts is still accepted here — the table above is the floor
 * — and what is added is finding the answer among other words.
 *
 * The refusals are the ones that matter: the reason this searches runs of whole
 * words rather than raw substrings is that `normalizeAnswer` drops whitespace,
 * and on a bare string a short answer is inside almost anything.
 */
const FOUND_IN: [expected: string, given: string, why: string][] = [
  ['On ira', 'jean jacques goldman on ira', 'the title after the artist'],
  [
    'Jean-Jacques Goldman',
    'jean jacques goldman on ira',
    'the artist before the title'
  ],
  ['On ira', 'daniel balavoine on ira', 'the right half of a half-wrong line'],
  ['Daft Punk', 'harder better faster stronger daft punk', 'the artist last'],
  [
    'Bohemian Rhapsody',
    'queen bohemian rapsody',
    'a slipped finger inside a line'
  ],
  ['Sexy Boy', 'sexy boy', 'the whole line, as before']
]

const NOT_FOUND_IN: [expected: string, given: string, why: string][] = [
  ['Hell', 'michelle', 'a short answer buried inside one longer word'],
  ['Go', 'jean jacques goldman', 'two letters that start another word'],
  ['Ira', 'irakli and the others', 'a short answer that only starts a word'],
  ['Daniel Balavoine', 'jean jacques goldman on ira', 'an artist nobody typed'],
  [
    'Thriller',
    'chandelier and some more',
    'a different word of a similar length'
  ],
  ['Sexy Boy', '', 'nothing at all']
]

describe('answerAppearsIn', () => {
  for (const [expected, given, why] of FOUND_IN) {
    it(`[matching] finds ${why}`, () => {
      expect(answerAppearsIn({ expected, given })).toBe(true)
    })
  }

  for (const [expected, given, why] of NOT_FOUND_IN) {
    it(`[matching] does not find ${why}`, () => {
      expect(answerAppearsIn({ expected, given })).toBe(false)
    })
  }

  it('[matching] accepts everything the whole-line matcher does', () => {
    for (const [expected, given] of ACCEPTED) {
      expect(answerAppearsIn({ expected, given })).toBe(true)
    }
  })
})
