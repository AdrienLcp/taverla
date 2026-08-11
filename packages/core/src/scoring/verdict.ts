import type { GameKind } from '@taverla/protocol/game'
import type { AnswerMode } from '@taverla/protocol/room'
import {
  POINTS_FOR_A_CLAIM,
  POINTS_FOR_A_RIGHT_CHOICE,
  POINTS_FOR_A_TYPED_ANSWER,
  POINTS_FOR_TITLE_AND_ARTIST,
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

/**
 * Whether this player has banked everything the round had for them, which is
 * what closes typed mode for them and what lets the round end before its clock
 * does. Two halves need both; one claim is finished the moment it is right.
 */
export const isFullyBanked = (verdict: Verdict): boolean =>
  verdict.kind === 'halves'
    ? verdict.titleCorrect && verdict.artistCorrect
    : verdict.isCorrect

/** Everyone answers at once in these two, so neither is decided by who was first to the buzzer. */
export type SimultaneousMode = Exclude<AnswerMode, 'buzzer'>

/**
 * What a simultaneous answer is worth before the speed bonus is added to it.
 * The mode sets the price and the verdict says how much of it was earned.
 *
 * A game judged on one claim pays the pair's rate for typing it and a pick's
 * rate for recognising it, which is the same gap the blind test opens between
 * its two modes. The blind test reaches its three by another road — a point per
 * half, and one more for holding both — because there half an answer is worth
 * something on its own.
 */
export const pointsForSimultaneousAnswer = ({
  mode,
  verdict
}: {
  mode: SimultaneousMode
  verdict: Verdict
}): number => {
  if (verdict.kind === 'single') {
    if (!verdict.isCorrect) {
      return 0
    }

    return mode === 'choice'
      ? POINTS_FOR_A_RIGHT_CHOICE
      : POINTS_FOR_A_TYPED_ANSWER
  }

  // A right pick sets both halves, so either one reads as "they got it".
  if (mode === 'choice') {
    return verdict.titleCorrect ? POINTS_FOR_A_RIGHT_CHOICE : 0
  }

  const halves =
    (verdict.titleCorrect ? POINTS_PER_TITLE : 0) +
    (verdict.artistCorrect ? POINTS_PER_ARTIST : 0)

  return isFullyBanked(verdict) ? halves + POINTS_FOR_TITLE_AND_ARTIST : halves
}
