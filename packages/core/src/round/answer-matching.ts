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

export const matchesAnswer = ({
  expected,
  given
}: AnswerComparison): boolean => {
  const target = normalizeAnswer(expected)
  const attempt = normalizeAnswer(given)

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
