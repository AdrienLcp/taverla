import {
  POINTS_FOR_TITLE_AND_ARTIST,
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
  SPEED_BONUS_BY_RANK,
  type Verdict
} from '@taverla/protocol/scoring'

import { matchesAnswer } from '../round/answer-matching'

export type TypedAttempt = {
  /** Blank when the player only knew one of the two. */
  artist: string
  kind: 'typed'
  title: string
}

type TrackAnswer = {
  artist: string
  title: string
}

/**
 * The server grades a typed answer where the host judges a spoken one, so this
 * returns the same `Verdict` the buzzer mode produces. Whichever way a round is
 * played, the reveal and the scoreboard read one shape.
 */
export const gradeTypedAnswer = ({
  attempt,
  track
}: {
  attempt: TypedAttempt
  track: TrackAnswer
}): Verdict => ({
  artistCorrect: matchesAnswer({
    expected: track.artist,
    given: attempt.artist
  }),
  titleCorrect: matchesAnswer({ expected: track.title, given: attempt.title })
})

/**
 * Half an answer scores on its own — a player who recognised the voice but not
 * the song has earned something, and a mode where half-knowledge is worth
 * nothing goes quiet fast.
 */
export const pointsForTypedAnswer = (verdict: Verdict): number => {
  const halves =
    (verdict.titleCorrect ? POINTS_PER_TITLE : 0) +
    (verdict.artistCorrect ? POINTS_PER_ARTIST : 0)

  return verdict.artistCorrect && verdict.titleCorrect
    ? halves + POINTS_FOR_TITLE_AND_ARTIST
    : halves
}

/**
 * `rank` counts only the players who scored, in arrival order — a wrong answer
 * that arrived first takes nobody's bonus, because nothing was won by being
 * quickly wrong.
 */
export const speedBonusForRank = (rank: number): number =>
  SPEED_BONUS_BY_RANK[rank] ?? 0
