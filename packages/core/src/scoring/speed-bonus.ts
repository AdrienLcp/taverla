import { SPEED_BONUS_BY_RANK } from '@taverla/protocol/scoring'

/**
 * `rank` counts only the players who scored, in arrival order — a wrong answer
 * that arrived first takes nobody's bonus, because nothing was won by being
 * quickly wrong.
 */
export const speedBonusForRank = (rank: number): number =>
  SPEED_BONUS_BY_RANK[rank] ?? 0
