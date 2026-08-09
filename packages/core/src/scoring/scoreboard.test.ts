import { describe, expect, it } from 'vitest'

import type { PublicPlayer } from '@taverla/protocol/room'
import type { Verdict } from '@taverla/protocol/scoring'

import { isMiss, pointsFor } from './award'
import { buildScoreboard } from './scoreboard'

const playerOn = (nickname: string, score: number): PublicPlayer => ({
  id: nickname.toLowerCase(),
  isConnected: true,
  nickname,
  score
})

const verdict = (titleCorrect: boolean, artistCorrect: boolean): Verdict => ({
  artistCorrect,
  titleCorrect
})

describe('pointsFor', () => {
  it.each([
    [verdict(true, true), 2],
    [verdict(true, false), 1],
    [verdict(false, true), 1],
    [verdict(false, false), 0]
  ])(
    '[scoring] scores each half of the answer independently',
    (given, expected) => {
      expect(pointsFor(given)).toBe(expected)
    }
  )
})

describe('isMiss', () => {
  it('[scoring] treats only a doubly-wrong answer as a miss', () => {
    expect(isMiss(verdict(false, false))).toBe(true)
    expect(isMiss(verdict(false, true))).toBe(false)
  })
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
