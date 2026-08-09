import type { PublicPlayer } from '@taverla/protocol/room'

export type ScoreboardEntry = {
  player: PublicPlayer
  /** Standard competition ranking: two players on 5 points are both 2nd, and the next is 4th. */
  rank: number
}

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
