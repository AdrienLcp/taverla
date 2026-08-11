import type { GameKind } from '@taverla/protocol/game'
import {
  POINTS_FOR_A_CLAIM,
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
  type Verdict
} from '@taverla/protocol/scoring'

/**
 * Which shape of verdict a game is judged in. The blind test asks two
 * independent questions of one answer, and it is the only thing on the shelf
 * that does — a charade and a quiz question are each guessed or they are not.
 *
 * The server checks a host's verdict against this before applying it: a
 * `halves` verdict in a buzzer round would pay two points for one claim, and a
 * socket is whatever its owner makes it.
 */
export const verdictKindFor = (game: GameKind): Verdict['kind'] =>
  game === 'blindtest' ? 'halves' : 'single'

/** The same shape, scoring nothing — a floor that ran out, or a host's "no". */
export const nothingScored = (game: GameKind): Verdict =>
  verdictKindFor(game) === 'halves'
    ? { artistCorrect: false, kind: 'halves', titleCorrect: false }
    : { isCorrect: false, kind: 'single' }

/** What a verdict is worth at face value, before a mode adds anything to it. */
export const pointsFor = (verdict: Verdict): number => {
  if (verdict.kind === 'single') {
    return verdict.isCorrect ? POINTS_FOR_A_CLAIM : 0
  }

  return (
    (verdict.titleCorrect ? POINTS_PER_TITLE : 0) +
    (verdict.artistCorrect ? POINTS_PER_ARTIST : 0)
  )
}

/** A verdict that scores nothing is what locks the player out for the rest of the round. */
export const isMiss = (verdict: Verdict): boolean => pointsFor(verdict) === 0
