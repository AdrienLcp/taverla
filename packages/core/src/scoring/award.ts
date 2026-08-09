import {
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
  type Verdict
} from '@taverla/protocol/scoring'

export const pointsFor = (verdict: Verdict): number =>
  (verdict.titleCorrect ? POINTS_PER_TITLE : 0) +
  (verdict.artistCorrect ? POINTS_PER_ARTIST : 0)

/** A verdict that scores nothing is what locks the player out for the rest of the round. */
export const isMiss = (verdict: Verdict): boolean => pointsFor(verdict) === 0
