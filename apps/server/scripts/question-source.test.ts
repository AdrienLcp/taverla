import { describe, expect, it } from 'vitest'

import { acceptedOf } from './question-source'

/**
 * The other rule in the ingestion that leaves no evidence in the built bank.
 * A spelling that would be graded right is *dropped* rather than banked, so
 * `question-bank.json` holds nothing to check it against — the row that kept
 * only the useful half looks exactly like a row Wikidata had one name for.
 *
 * Its dangerous neighbour is guarded there instead: a spelling matching one of
 * the row's own three printed candidates goes red under
 * `[bank] holds no question whose own decoy would be graded right`, because
 * that test grades the decoy against the whole row, `accepted` included.
 */
describe('acceptedOf', () => {
  const LAKERS = {
    answer: 'Lakers de Los Angeles',
    decoys: ['Celtics de Boston', 'Bulls de Chicago', 'Knicks de New York'],
    wrongSpellings: []
  }

  it('[bank] banks the short name a room would shout', () => {
    expect(acceptedOf({ ...LAKERS, spellings: ['Lakers'] })).toEqual(['Lakers'])
  })

  it('[bank] drops a spelling the row already grades right', () => {
    expect(
      acceptedOf({ ...LAKERS, spellings: ['Lakers de los angeles'] })
    ).toEqual([])
  })

  it('[bank] drops a spelling too short to be told from a slip', () => {
    expect(acceptedOf({ ...LAKERS, spellings: ['LA'] })).toEqual([])
  })

  /**
   * Wikidata files *Gaius Julius Caesar* under Augustus, and the man it names
   * is printed beside him as a decoy under his French label. Nothing in the
   * row says the two are the same person, which is why the decoys' own names
   * have to be asked for.
   */
  it('[bank] drops a spelling one of the wrong answers goes by', () => {
    expect(
      acceptedOf({
        answer: 'Auguste',
        decoys: ['Néron', 'Jules César', 'Caligula'],
        spellings: ['Octave', 'Gaius Julius Caesar'],
        wrongSpellings: ['Caius Julius Caesar', 'César', 'Jules Caesar']
      })
    ).toEqual(['Octave'])
  })
})
