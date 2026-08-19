import type { HalvesVerdict } from '@taverla/protocol/scoring'

import {
  answerAppearsIn,
  normalizeAnswer,
  withoutCatalogueNoise
} from '../round/answer-matching'

export type TypedAttempt = {
  guess: string
  kind: 'typed'
}

type TrackAnswer = {
  artist: string
  film: string | null
  title: string
}

/**
 * The half a room can actually produce, which on a track drawn from film
 * composers is not the title. A score cue is called `Cornfield Chase`,
 * `Day One`, `Concerning Hobbits` — nobody at the table has ever heard those
 * words, and everybody shouts *Interstellar* before the clip has finished.
 *
 * The reveal still shows the cue. It is only what the round *asks for* that
 * moves, which is why the verdict keeps one shape either way.
 */
export const whatTheRoomNames = (track: TrackAnswer): string =>
  track.film ?? track.title

/**
 * The piece that actually played, for the one line the reveal has left once the
 * film is on the screen — and `null` wherever that line would only say again
 * what is already up there.
 *
 * A catalogue writes the film into the cue as often as not, so
 * `They're Sending Me To Vietnam (From "Forrest Gump" Score)` under a screen
 * reading *Forrest Gump* is the film printed twice. And a score whose one
 * famous cue carries the film's own name — `Subway` on *Subway* — has nothing
 * to add at all.
 */
export const cueOf = (track: TrackAnswer): string | null => {
  if (track.film === null) {
    return null
  }

  const cue = withoutCatalogueNoise(track.title).trim()

  return cue.length === 0 ||
    normalizeAnswer(cue) === normalizeAnswer(track.film)
    ? null
    : cue
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
  titleCorrect: answerAppearsIn({
    expected: whatTheRoomNames(track),
    given: guess
  })
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
