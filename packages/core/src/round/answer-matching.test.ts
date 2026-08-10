import { describe, expect, it } from 'vitest'

import { matchesAnswer, normalizeAnswer } from './answer-matching'

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
