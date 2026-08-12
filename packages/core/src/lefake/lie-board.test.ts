import { describe, expect, it } from 'vitest'

import { type BoardEntry, buildLieBoard, MINIMUM_BOARD_SIZE } from './lie-board'

const DECOYS = ['a drum', 'a pigeon', 'a ladder']

const lineSaying = (board: readonly BoardEntry[], text: string): BoardEntry => {
  const found = board.find((entry) => entry.text === text)

  if (found === undefined) {
    throw new Error(`no line saying "${text}" on the board`)
  }

  return found
}

describe('buildLieBoard', () => {
  it('[lefake] merges two identical lies into one line credited to both', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [
        { playerId: 'ana', text: 'a tightrope' },
        { playerId: 'bo', text: 'A Tightrope' },
        { playerId: 'cy', text: 'a wire' }
      ],
      truth: 'a beam'
    })

    expect(
      board.filter((entry) => entry.text.toLowerCase() === 'a tightrope')
    ).toHaveLength(1)
    expect(lineSaying(board, 'a tightrope').authorIds).toEqual(['ana', 'bo'])
  })

  it('[lefake] never credits a lie that is the truth', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [{ playerId: 'ana', text: 'A Beam' }],
      truth: 'a beam'
    })

    const truth = board.find((entry) => entry.isTruth)

    expect(truth?.authorIds).toEqual([])
    expect(board.filter((entry) => entry.isTruth)).toHaveLength(1)
  })

  it('[lefake] pads a three-player table up to a full board', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [
        { playerId: 'ana', text: 'a wire' },
        { playerId: 'bo', text: 'a rail' },
        { playerId: 'cy', text: 'a rope bridge' }
      ],
      truth: 'a beam'
    })

    expect(board).toHaveLength(MINIMUM_BOARD_SIZE)
    expect(board.filter((entry) => entry.authorIds.length === 0)).toHaveLength(
      2
    )
  })

  it('[lefake] pads a lone writer from three decoys and stops there', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [{ playerId: 'ana', text: 'a wire' }],
      truth: 'a beam'
    })

    expect(board).toHaveLength(MINIMUM_BOARD_SIZE)
  })

  it('[lefake] leaves a full table unpadded', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [
        { playerId: 'ana', text: 'a wire' },
        { playerId: 'bo', text: 'a rail' },
        { playerId: 'cy', text: 'a rope bridge' },
        { playerId: 'di', text: 'a plank' },
        { playerId: 'ed', text: 'a cable' }
      ],
      truth: 'a beam'
    })

    expect(board).toHaveLength(6)
    expect(board.filter((entry) => entry.authorIds.length === 0)).toHaveLength(
      1
    )
  })

  it('[lefake] does not pad with a decoy somebody already wrote', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [{ playerId: 'ana', text: 'A Drum' }],
      truth: 'a beam'
    })

    expect(
      board.filter((entry) => entry.text.toLowerCase() === 'a drum')
    ).toHaveLength(1)
    expect(lineSaying(board, 'A Drum').authorIds).toEqual(['ana'])
  })

  it('[lefake] gives every line a distinct id', () => {
    const board = buildLieBoard({
      decoys: DECOYS,
      lies: [
        { playerId: 'ana', text: 'a wire' },
        { playerId: 'bo', text: 'a rail' }
      ],
      truth: 'a beam'
    })

    expect(new Set(board.map((entry) => entry.id)).size).toBe(board.length)
  })
})
