import { describe, expect, it } from 'vitest'

import type { PublicPlayer } from '@taverla/protocol/room'

import { buildScoreboard, hasAnybodyScored } from './scoreboard'

const playerOn = (nickname: string, score: number): PublicPlayer => ({
  id: nickname.toLowerCase(),
  isConnected: true,
  nickname,
  score
})

describe('buildScoreboard', () => {
  it('[scoring] orders by score, highest first', () => {
    const board = buildScoreboard([playerOn('Alice', 1), playerOn('Bob', 5)])

    expect(board.map((entry) => entry.player.nickname)).toEqual([
      'Bob',
      'Alice'
    ])
  })

  it('[scoring] gives tied players the same rank and skips the next one', () => {
    const board = buildScoreboard([
      playerOn('Alice', 5),
      playerOn('Bob', 5),
      playerOn('Chloe', 1)
    ])

    expect(board.map((entry) => entry.rank)).toEqual([1, 1, 3])
  })

  // The board is on a wall for the whole game. Any ordering that depends on
  // arrival order or object identity would visibly reshuffle tied players
  // between two renders of the same scores.
  it('[scoring] breaks ties deterministically, whatever the input order', () => {
    const nicknames = (players: PublicPlayer[]) =>
      buildScoreboard(players).map((entry) => entry.player.nickname)

    const oneWay = [playerOn('Bob', 5), playerOn('Alice', 5)]

    expect(nicknames(oneWay)).toEqual(['Alice', 'Bob'])
    expect(nicknames([...oneWay].reverse())).toEqual(['Alice', 'Bob'])
  })

  it('[scoring] handles an empty room', () => {
    expect(buildScoreboard([])).toEqual([])
  })
})

describe('hasAnybodyScored', () => {
  it('[scoring] is false while the whole room is on zero', () => {
    expect(hasAnybodyScored([playerOn('Alice', 0), playerOn('Bob', 0)])).toBe(
      false
    )
  })

  it('[scoring] is true as soon as one player is on the board', () => {
    expect(hasAnybodyScored([playerOn('Alice', 0), playerOn('Bob', 1)])).toBe(
      true
    )
  })

  it('[scoring] is false for an empty room', () => {
    expect(hasAnybodyScored([])).toBe(false)
  })
})
