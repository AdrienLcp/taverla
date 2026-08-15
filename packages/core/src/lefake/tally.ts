import type { PlayerId } from '@taverla/protocol/identifiers'
import {
  type Award,
  POINTS_FOR_FINDING_THE_TRUTH,
  POINTS_PER_PLAYER_FOOLED
} from '@taverla/protocol/scoring'

import type { BoardEntry } from './lie-board'

export type Vote = {
  candidateId: string
  playerId: PlayerId
}

/**
 * What the round paid, and the only tally on the shelf where being wrong is
 * worth something: a point for every player who believed your lie, on top of two
 * for finding the truth yourself.
 *
 * The two halves are independent. A player who wrote a lie nobody fell for and
 * then spotted the truth scores exactly as much as one who fooled two people and
 * voted for a decoy — which is what keeps a table that does not know the answer
 * playing.
 *
 * `isCorrect` on the verdict is about the *vote*, not about the lie. It is the
 * only claim of the round the server judges, and a player who wrote a beautiful
 * lie and then guessed wrong did guess wrong.
 */
export const tallyLieBoard = ({
  board,
  votes
}: {
  board: readonly BoardEntry[]
  votes: readonly Vote[]
}): Award[] => {
  const votedFor = new Map<string, PlayerId[]>()

  for (const vote of votes) {
    votedFor.set(vote.candidateId, [
      ...(votedFor.get(vote.candidateId) ?? []),
      vote.playerId
    ])
  }

  const truthId = board.find((entry) => entry.isTruth)?.id
  const earned = new Map<PlayerId, number>()

  const credit = (playerId: PlayerId, points: number): void => {
    earned.set(playerId, (earned.get(playerId) ?? 0) + points)
  }

  for (const entry of board) {
    for (const author of entry.authorIds) {
      credit(
        author,
        (votedFor.get(entry.id)?.length ?? 0) * POINTS_PER_PLAYER_FOOLED
      )
    }
  }

  for (const vote of votes) {
    credit(
      vote.playerId,
      vote.candidateId === truthId ? POINTS_FOR_FINDING_THE_TRUTH : 0
    )
  }

  return [...earned]
    .map(([playerId, points]) => ({
      playerId,
      points,
      // Voting fast is voting without reading the board, and on the other half
      // it would pay the lie written quickly where a good lie is the one
      // somebody thought about. Both phases push the wrong way.
      speedBonus: 0,
      verdict: {
        isCorrect: votes.some(
          (vote) => vote.playerId === playerId && vote.candidateId === truthId
        ),
        kind: 'single' as const
      }
    }))
    .sort(byPointsThenId)
}

/**
 * The reveal reads this top-down and the biggest number is the story of the
 * round. The id is the tie-break so the order is the same on every screen and in
 * every test run — the map's insertion order is the shuffled board's.
 */
const byPointsThenId = (one: Award, other: Award): number =>
  other.points - one.points || one.playerId.localeCompare(other.playerId)
