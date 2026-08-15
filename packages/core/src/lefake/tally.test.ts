import { describe, expect, it } from 'vitest'

import type { BoardEntry } from './lie-board'
import { tallyLieBoard } from './tally'

const BOARD: BoardEntry[] = [
  { authorIds: [], id: 'c0', isTruth: true, text: 'a beam' },
  { authorIds: ['ana'], id: 'c1', isTruth: false, text: 'a wire' },
  { authorIds: ['bo', 'cy'], id: 'c2', isTruth: false, text: 'a rope' },
  { authorIds: [], id: 'c3', isTruth: false, text: 'a ladder' }
]

const pointsFor = (
  awards: ReturnType<typeof tallyLieBoard>,
  playerId: string
): number | undefined =>
  awards.find((award) => award.playerId === playerId)?.points

describe('tallyLieBoard', () => {
  it('[lefake] pays two for finding the truth', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [{ candidateId: 'c0', playerId: 'di' }]
    })

    expect(pointsFor(awards, 'di')).toBe(2)
    expect(awards.find((award) => award.playerId === 'di')?.verdict).toEqual({
      isCorrect: true,
      kind: 'single'
    })
  })

  it('[lefake] pays one per player fooled', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [
        { candidateId: 'c1', playerId: 'bo' },
        { candidateId: 'c1', playerId: 'di' }
      ]
    })

    expect(pointsFor(awards, 'ana')).toBe(2)
  })

  it('[lefake] credits both authors of a merged lie in full', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [
        { candidateId: 'c2', playerId: 'ana' },
        { candidateId: 'c2', playerId: 'di' }
      ]
    })

    expect(pointsFor(awards, 'bo')).toBe(2)
    expect(pointsFor(awards, 'cy')).toBe(2)
  })

  it('[lefake] pays the two halves independently', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [
        { candidateId: 'c0', playerId: 'ana' },
        { candidateId: 'c1', playerId: 'bo' }
      ]
    })

    expect(pointsFor(awards, 'ana')).toBe(3)
  })

  it('[lefake] pays nobody for a vote that landed on a decoy', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [{ candidateId: 'c3', playerId: 'di' }]
    })

    expect(pointsFor(awards, 'di')).toBe(0)
    expect(awards.every((award) => award.points === 0)).toBe(true)
  })

  it('[lefake] records a wrong vote as an award worth nothing rather than no award', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [{ candidateId: 'c1', playerId: 'di' }]
    })

    expect(awards.find((award) => award.playerId === 'di')).toEqual({
      playerId: 'di',
      points: 0,
      speedBonus: 0,
      verdict: { isCorrect: false, kind: 'single' }
    })
  })

  it('[lefake] reads biggest first, so the reveal opens on the round s story', () => {
    const awards = tallyLieBoard({
      board: BOARD,
      votes: [
        { candidateId: 'c2', playerId: 'ana' },
        { candidateId: 'c2', playerId: 'di' },
        { candidateId: 'c0', playerId: 'ed' }
      ]
    })

    expect(awards.map((award) => award.points)).toEqual([2, 2, 2, 0, 0])
  })
})
