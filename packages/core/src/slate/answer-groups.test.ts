import { describe, expect, it } from 'vitest'

import { groupAnswers, isBlankAnswer } from './answer-groups'

describe('groupAnswers', () => {
  it('[slate] puts every spelling of one answer in one group', () => {
    const groups = groupAnswers([
      { playerId: 'ana', text: 'Paprika' },
      { playerId: 'bob', text: 'paprika ' },
      { playerId: 'cy', text: 'le paprika' },
      { playerId: 'dee', text: 'Pâprika' }
    ])

    expect(groups).toEqual([
      {
        key: 'paprika',
        playerIds: ['ana', 'bob', 'cy', 'dee'],
        text: 'Paprika'
      }
    ])
  })

  // A group is the same answer. Whether a near miss is close enough is the
  // host's call on the wall, so no typo tolerance merges two of them here.
  it('[slate] keeps a near miss in a group of its own', () => {
    const groups = groupAnswers([
      { playerId: 'ana', text: 'barbecue' },
      { playerId: 'bob', text: 'barbecu' }
    ])

    expect(groups.map((group) => group.playerIds)).toEqual([['bob'], ['ana']])
  })

  it('[slate] leaves blanks out, so none can be validated', () => {
    const groups = groupAnswers([
      { playerId: 'ana', text: '' },
      { playerId: 'bob', text: ' ?! ' },
      { playerId: 'cy', text: 'sel' }
    ])

    expect(groups.map((group) => group.key)).toEqual(['sel'])
  })

  // Catalogue noise is the blind test's: a tasting note in brackets is part of
  // what the player meant.
  it('[slate] does not fold what a music catalogue would call noise', () => {
    const groups = groupAnswers([
      { playerId: 'ana', text: 'poivre (noir)' },
      { playerId: 'bob', text: 'poivre' }
    ])

    expect(groups).toHaveLength(2)
  })

  it('[slate] shows the spelling most of the group wrote, largest group first', () => {
    const groups = groupAnswers([
      { playerId: 'ana', text: 'sel' },
      { playerId: 'bob', text: 'oignon' },
      { playerId: 'cy', text: 'Oignon' },
      { playerId: 'dee', text: 'Oignon' }
    ])

    expect(groups.map(({ playerIds, text }) => ({ playerIds, text }))).toEqual([
      { playerIds: ['bob', 'cy', 'dee'], text: 'Oignon' },
      { playerIds: ['ana'], text: 'sel' }
    ])
  })
})

describe('isBlankAnswer', () => {
  it('[slate] reads a missing line and a line of punctuation alike', () => {
    expect(isBlankAnswer(null)).toBe(true)
    expect(isBlankAnswer('...')).toBe(true)
    expect(isBlankAnswer('0')).toBe(false)
  })
})
