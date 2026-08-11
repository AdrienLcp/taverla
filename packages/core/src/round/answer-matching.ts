/**
 * Bracketed segments and a trailing dashed suffix are how catalogues carry
 * everything that is not the title: `(feat. …)`, `(Radio Edit)`, `[Explicit]`,
 * `- Remastered 2011`, `- Live at Wembley`. Nobody types those, and a player
 * who did would be refused for being *more* right than the answer.
 *
 * The dash needs its spaces. `Jean-Jacques` is one word and must survive.
 */
const CATALOGUE_NOISE = /\([^)]*\)|\[[^\]]*\]|\s+-\s+.*$/gu

const DIACRITICS = /\p{Diacritic}/gu

const NOT_A_LETTER_OR_DIGIT = /[^\p{L}\p{N}]/gu

/**
 * Both what the player typed and what the catalogue holds go through this
 * before anything is compared. It folds away everything a room gets wrong for
 * reasons that are not about knowing the song.
 *
 * **Whitespace is dropped rather than collapsed**, which is what makes
 * `daftpunk` and `daft punk` the same answer — and, with punctuation gone,
 * `hip-hop` and `hip hop` too. Word boundaries carry no information here: two
 * answers that differ only in where the spaces fall are the same guess.
 */
export const normalizeAnswer = (answer: string): string =>
  answer
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(CATALOGUE_NOISE, '')
    .replace(NOT_A_LETTER_OR_DIGIT, '')
    .toLowerCase()

/**
 * How many single-character corrections are forgiven, from the length of the
 * answer being matched against.
 *
 * It scales because a fixed number cuts both ways: one correction turns `live`
 * into `love` and `help` into `hell`, while a sixteen-character title with a
 * slipped finger is still unmistakably the right song. Below six characters
 * nothing is forgiven at all — there is no typo short enough to be safe there.
 *
 * The ceiling exists because the distance stops being evidence of a typo once
 * it is large; past three corrections a match says more about the threshold
 * than about what the player knew.
 */
const CHARACTERS_PER_FORGIVEN_TYPO = 6
const MOST_TYPOS_FORGIVEN = 3

const forgivenTypos = (length: number): number =>
  Math.min(
    Math.floor(length / CHARACTERS_PER_FORGIVEN_TYPO),
    MOST_TYPOS_FORGIVEN
  )

type AnswerComparison = {
  /** What the catalogue holds — the title or the artist, unnormalised. */
  expected: string
  /** What the player typed, unnormalised. */
  given: string
}

export const matchesAnswer = ({ expected, given }: AnswerComparison): boolean =>
  matchesNormalized(normalizeAnswer(expected), normalizeAnswer(given))

const matchesNormalized = (target: string, attempt: string): boolean => {
  if (target.length === 0 || attempt.length === 0) {
    return false
  }

  if (target === attempt) {
    return true
  }

  const allowed = forgivenTypos(target.length)

  return allowed > 0 && editDistanceWithin(target, attempt, allowed)
}

/**
 * Whether the answer is *somewhere in* what was typed. One field takes one
 * claim, and a room types the two halves on one line as often as not — "jean
 * jacques goldman on ira" has to find both, and "daniel balavoine on ira" has
 * to find the title and leave the artist still owed.
 *
 * The search is over **runs of whole words**, never raw substrings, and that is
 * the guard rather than a length threshold: `normalizeAnswer` drops whitespace,
 * so on the bare string a title of `Hell` would be found inside `Michelle` and
 * a title of `Go` inside almost anything. Splitting on the boundaries first
 * puts them back, so only something the player actually said can match.
 *
 * Every run is compared with the same forgiveness as a whole answer, so a
 * slipped finger inside a long line still lands.
 */
export const answerAppearsIn = ({
  expected,
  given
}: AnswerComparison): boolean => {
  const target = normalizeAnswer(expected)

  if (target.length === 0) {
    return false
  }

  const spoken = wordsIn(given)

  for (let from = 0; from < spoken.length; from++) {
    let run = ''

    for (let to = from; to < spoken.length; to++) {
      run += spoken[to]

      if (run.length > target.length + MOST_TYPOS_FORGIVEN) {
        break
      }

      if (matchesNormalized(target, run)) {
        return true
      }
    }
  }

  return false
}

/**
 * The same folding as `normalizeAnswer`, stopping short of dropping the
 * boundaries — `Jean-Jacques` is two words here and one there, and both are
 * right for what each is used for.
 */
const wordsIn = (answer: string): string[] =>
  answer
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(CATALOGUE_NOISE, '')
    .toLowerCase()
    .split(NOT_A_LETTER_OR_DIGIT)
    .filter((word) => word.length > 0)

/**
 * Levenshtein, stopped as soon as every cell of a row exceeds the tolerance —
 * two strings of wildly different lengths are not a typo and are not worth
 * finishing the matrix for.
 */
const editDistanceWithin = (
  target: string,
  attempt: string,
  allowed: number
): boolean => {
  if (Math.abs(target.length - attempt.length) > allowed) {
    return false
  }

  let previous = Array.from({ length: attempt.length + 1 }, (_, index) => index)

  for (let row = 1; row <= target.length; row++) {
    const current = [row]

    for (let column = 1; column <= attempt.length; column++) {
      const substitution =
        (previous[column - 1] ?? 0) +
        (target[row - 1] === attempt[column - 1] ? 0 : 1)

      current[column] = Math.min(
        substitution,
        (previous[column] ?? 0) + 1,
        (current[column - 1] ?? 0) + 1
      )
    }

    if (Math.min(...current) > allowed) {
      return false
    }

    previous = current
  }

  return (previous[attempt.length] ?? Number.POSITIVE_INFINITY) <= allowed
}
