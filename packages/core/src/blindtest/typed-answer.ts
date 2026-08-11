import type { HalvesVerdict } from '@taverla/protocol/scoring'

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
 * returns the same `halves` verdict the blind test's buzzer produces. Whichever
 * way a round is played, the reveal and the scoreboard read one shape.
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
}): HalvesVerdict => ({
  artistCorrect: answerAppearsIn({ expected: track.artist, given: guess }),
  kind: 'halves',
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
  banked: HalvesVerdict
  guessed: HalvesVerdict
}): HalvesVerdict => ({
  artistCorrect: banked.artistCorrect || guessed.artistCorrect,
  kind: 'halves',
  titleCorrect: banked.titleCorrect || guessed.titleCorrect
})

/** A right pick is the whole answer, so it lands both halves at once. */
export const choiceVerdict = (isRight: boolean): HalvesVerdict => ({
  artistCorrect: isRight,
  kind: 'halves',
  titleCorrect: isRight
})

export const NOTHING_BANKED: HalvesVerdict = choiceVerdict(false)
