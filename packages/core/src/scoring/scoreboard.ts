import type { PlayerId } from '@taverla/protocol/identifiers'
import type { PublicPlayer } from '@taverla/protocol/room'

export type ScoreboardEntry = {
  player: PublicPlayer
  /** Standard competition ranking: two players on 5 points are both 2nd, and the next is 4th. */
  rank: number
}

/**
 * Whether a board has anything to rank. Before the first point every player is
 * first on nothing, so the screens that would say so drop the claim instead:
 * the roster loses its rank and score columns, the player is told no placing,
 * and the final board names nobody.
 */
export const hasAnybodyScored = (players: readonly PublicPlayer[]): boolean =>
  players.some((player) => player.score > 0)

/**
 * Ties break on nickname so the board does not reshuffle itself between two
 * renders of the same scores — the players are watching it on a wall.
 */
export const buildScoreboard = (
  players: readonly PublicPlayer[]
): ScoreboardEntry[] => {
  const ordered = [...players].sort(
    (left, right) =>
      right.score - left.score || left.nickname.localeCompare(right.nickname)
  )

  let currentRank = 0
  let previousScore: number | null = null

  return ordered.map((player, index) => {
    if (player.score !== previousScore) {
      currentRank = index + 1
      previousScore = player.score
    }

    return { player, rank: currentRank }
  })
}

export type Standing = {
  rank: number
  roomSize: number
}

/**
 * Where one player stands, in the two facts that are true at *every* phase — a
 * place and the size of the room. That is what the persistent strip on a
 * player's screen carries, and it is why the strip rather than the reveal is
 * where a place belongs: a board is only true once a round has revealed.
 *
 * `null` wherever the board has nothing to say — the same threshold every other
 * ranked surface uses, so a lobby does not announce a first place on nought.
 */
export const standingOf = ({
  players,
  youId
}: {
  players: readonly PublicPlayer[]
  youId: PlayerId | null
}): Standing | null => {
  if (youId === null || !hasAnybodyScored(players)) {
    return null
  }

  const board = buildScoreboard(players)
  const yours = board.find((entry) => entry.player.id === youId)

  if (yours === undefined) {
    return null
  }

  return { rank: yours.rank, roomSize: players.length }
}
