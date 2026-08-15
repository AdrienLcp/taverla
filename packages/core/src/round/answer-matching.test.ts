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
  ['Où sont les femmes ?', 'ou sont les femmes', 'accents'],
  ['Daft Punk', 'daftpunk', 'a missing space'],
  ['Bohemian Rhapsody', 'bohemian rapsody', 'one slipped finger'],
  ['Imagine', 'imagin', 'a truncation on a short title'],
  ['Jean-Jacques Goldman', 'jean jacques goldman', 'a hyphen typed as a space'],
  ['Le Cervin', 'cervin', 'a French article the room did not say'],
  ['The Beatles', 'beatles', 'the same in English']
]

/**
 * The music catalogue's own rules, and the blind test's alone since a quiz
 * answers `River Horse (Greek)` and `1915 - 1916`. They are asserted through
 * `answerAppearsIn` for that reason, and nowhere else.
 */
const CATALOGUE_NOISE: [expected: string, given: string, why: string][] = [
  ['Ella, elle l’a (Remasterisé en 2004)', 'ella elle la', 'a remaster tag'],
  ['Get Lucky (feat. Pharrell Williams)', 'get lucky', 'a featuring credit'],
  ['Wake Me Up - Radio Edit', 'wake me up', 'a dashed suffix']
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
    expect(normalizeAnswer('Ella, elle l’a')).toBe('ellaellela')
  })

  it('[matching] keeps a hyphenated word whole', () => {
    expect(normalizeAnswer('Jean-Jacques')).toBe('jeanjacques')
  })

  it('[matching] drops the article in front and nowhere else', () => {
    expect(normalizeAnswer('Le Cervin')).toBe('cervin')
    expect(normalizeAnswer('L’Été meurtrier')).toBe('etemeurtrier')
    expect(normalizeAnswer('The Beatles')).toBe('beatles')
  })

  /**
   * The article is stripped where it is a word of its own, so an answer that
   * merely starts with those letters keeps them: `Latin` is not `tin`, and the
   * answer to how many is `Un` rather than nothing at all.
   */
  it('[matching] leaves a word that only begins like an article', () => {
    expect(normalizeAnswer('Latin')).toBe('latin')
    expect(normalizeAnswer('Un')).toBe('un')
    expect(normalizeAnswer('Andes')).toBe('andes')
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
 * The rule the question bank needed: a room asked how long an otarie holds its
 * breath is offered five minutes and seven, and `5 minutes` is eight characters
 * — one forgiven correction, which is exactly the distance to the wrong answer.
 * Every numeric row in the bank had that shape.
 */
describe('matchesAnswer, against answers the bank calls wrong', () => {
  const FIVE_MINUTES = {
    distinctFrom: ['7 minutes', '30 secondes', '2 heures'],
    expected: '5 minutes'
  }

  it('[matching] still takes the answer itself', () => {
    expect(matchesAnswer({ ...FIVE_MINUTES, given: '5 minutes' })).toBe(true)
    expect(matchesAnswer({ ...FIVE_MINUTES, given: '5minutes' })).toBe(true)
  })

  it('[matching] refuses the decoy one correction away', () => {
    expect(matchesAnswer({ ...FIVE_MINUTES, given: '7 minutes' })).toBe(false)
  })

  it('[matching] spends the forgiveness a crowded answer cannot afford', () => {
    expect(matchesAnswer({ ...FIVE_MINUTES, given: '5 minute' })).toBe(false)
    expect(matchesAnswer({ expected: '5 minutes', given: '5 minute' })).toBe(
      true
    )
  })

  it('[matching] leaves an answer nothing crowds exactly as forgiving', () => {
    const winslet = {
      distinctFrom: ['Cate Blanchett', 'Nicole Kidman', 'Naomi Watts'],
      expected: 'Kate Winslet'
    }

    expect(matchesAnswer({ ...winslet, given: 'kate winslett' })).toBe(true)
    expect(matchesAnswer({ ...winslet, given: 'nicole kidman' })).toBe(false)
  })
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

  for (const [expected, given, why] of CATALOGUE_NOISE) {
    it(`[matching] sees past ${why}`, () => {
      expect(answerAppearsIn({ expected, given })).toBe(true)
    })
  }

  it('[matching] drops a dashed suffix but not a dash inside a word', () => {
    expect(
      answerAppearsIn({
        expected: 'Sunday Bloody Sunday - Live',
        given: 'sunday bloody sunday'
      })
    ).toBe(true)
    expect(
      answerAppearsIn({ expected: 'Jean-Jacques', given: 'jean jacques' })
    ).toBe(true)
  })
})
