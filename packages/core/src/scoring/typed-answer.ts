import {
  POINTS_FOR_A_RIGHT_CHOICE,
  POINTS_FOR_TITLE_AND_ARTIST,
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
  SPEED_BONUS_BY_RANK,
  type Verdict
} from '@taverla/protocol/scoring'

import { answerAppearsIn } from '../round/answer-matching'

export type TypedAttempt = {
  guess: string
  kind: 'typed'
}

type TrackAnswer = {
  artist: string
  title: string
}

/**
 * The server grades a typed guess where the host judges a spoken one, so this
 * returns the same `Verdict` the buzzer mode produces. Whichever way a round is
 * played, the reveal and the scoreboard read one shape.
 *
 * One guess is measured against **both** halves rather than the player saying
 * which they meant, and each half is looked for *inside* the line rather than
 * against the whole of it. That is what makes one field honest: a room types
 * "jean jacques goldman on ira" and gets both, or "daniel balavoine on ira" and
 * gets the title with the artist still owed.
 */
export const gradeGuess = ({
  guess,
  track
}: {
  guess: string
  track: TrackAnswer
}): Verdict => ({
  artistCorrect: answerAppearsIn({ expected: track.artist, given: guess }),
  titleCorrect: answerAppearsIn({ expected: track.title, given: guess })
})

/**
 * Everything a player has banked so far. Verdicts only ever gain halves within
 * a round: a guess that misses takes nothing away, because the clip is already
 * the cost of guessing again.
 */
export const withGuessBanked = ({
  banked,
  guessed
}: {
  banked: Verdict
  guessed: Verdict
}): Verdict => ({
  artistCorrect: banked.artistCorrect || guessed.artistCorrect,
  titleCorrect: banked.titleCorrect || guessed.titleCorrect
})

export const hasBothHalves = (verdict: Verdict): boolean =>
  verdict.artistCorrect && verdict.titleCorrect

export const NOTHING_BANKED: Verdict = {
  artistCorrect: false,
  titleCorrect: false
}

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

/** A right pick, before the speed bonus. Deliberately not what typing pays. */
export const pointsForChoice = (verdict: Verdict): number =>
  verdict.titleCorrect ? POINTS_FOR_A_RIGHT_CHOICE : 0

/**
 * `rank` counts only the players who scored, in arrival order — a wrong answer
 * that arrived first takes nobody's bonus, because nothing was won by being
 * quickly wrong.
 */
export const speedBonusForRank = (rank: number): number =>
  SPEED_BONUS_BY_RANK[rank] ?? 0
