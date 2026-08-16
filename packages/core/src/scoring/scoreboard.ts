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
 * the roster loses its rank and score columns, the phone is told no placing,
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
  /**
   * The row above this one on the board, and `null` for whoever is on the most
   * points. A tie is not somebody to catch, so the search reaches past everyone
   * level with this player to the score over them.
   */
  chasing: { nickname: string; pointsBehind: number } | null
  rank: number
  roomSize: number
}

/**
 * Where one player stands, which is the whole of what the room's board is worth
 * on a screen held in a hand: the full list asks a player to read it, where a
 * place and a gap answer *did I gain?* at a glance and leave the list to the
 * screen the room is already looking at.
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

  const above = board.findLast(
    (entry) => entry.player.score > yours.player.score
  )

  return {
    chasing:
      above === undefined
        ? null
        : {
            nickname: above.player.nickname,
            pointsBehind: above.player.score - yours.player.score
          },
    rank: yours.rank,
    roomSize: players.length
  }
}
