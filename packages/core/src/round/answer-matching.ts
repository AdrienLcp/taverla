/**
 * Bracketed segments and a trailing dashed suffix are how **a music catalogue**
 * carries everything that is not the title: `(feat. …)`, `(Radio Edit)`,
 * `[Explicit]`, `- Remastered 2011`, `- Live at Wembley`. Nobody types those,
 * and a player who did would be refused for being *more* right than the answer.
 *
 * The dash needs its spaces. `Jean-Jacques` is one word and must survive.
 *
 * It is the blind test's rule and **only** its rule, the same way searching
 * within a line is: a quiz answers `River Horse (Greek)` and `1915 - 1916`, and
 * folding those leaves two questions whose decoys are the answer.
 */
const CATALOGUE_NOISE = /\([^)]*\)|\[[^\]]*\]|\s+-\s+.*$/gu

const DIACRITICS = /\p{Diacritic}/gu

const NOT_A_LETTER_OR_DIGIT = /[^\p{L}\p{N}]/gu

/**
 * A room says *Cervin* where the bank holds *Le Cervin*, and *Beatles* where a
 * catalogue holds *The Beatles*. The article is not what the question was
 * about, and it is at the front where a length difference costs the most: two
 * characters over a seven-character answer is past every tolerance below.
 *
 * Only at the front, and only followed by a boundary — `Latin` and `Un` are
 * answers, and neither is an article with something after it.
 */
const LEADING_ARTICLE = /^(?:the|an?|le|la|les|une?|des|du)\s+|^l['’]/u

/**
 * Both what the player typed and what the bank holds go through this before
 * anything is compared. It folds away everything a room gets wrong for reasons
 * that are not about knowing the answer.
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
    .toLowerCase()
    .replace(LEADING_ARTICLE, '')
    .replace(NOT_A_LETTER_OR_DIGIT, '')

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
  /**
   * Other answers this one is known to be different from — a quiz question's
   * own three decoys, which is the bank saying out loud how much difference it
   * takes to be a different answer. `5 minutes` beside `7 minutes` says one
   * character is the whole of it, and forgiveness reaching across that pays a
   * player for the answer the question itself called wrong.
   *
   * So forgiveness stops one edit short of the nearest, per answer rather than
   * per bank: `Kate Winslet` among three other actresses keeps all of hers, and
   * only the rows whose decoys crowd the answer lose any. Empty where nothing
   * has been named — the blind test has no decoys and a catalogue no rivals.
   */
  distinctFrom?: readonly string[]
  /** What the bank holds — the title, the artist or the answer, unnormalised. */
  expected: string
  /** What the player typed, unnormalised. */
  given: string
}

export const matchesAnswer = ({
  distinctFrom = [],
  expected,
  given
}: AnswerComparison): boolean => {
  const target = normalizeAnswer(expected)

  return matchesNormalized(
    target,
    normalizeAnswer(given),
    forgivenessBetween(target, distinctFrom)
  )
}

const forgivenessBetween = (
  target: string,
  distinctFrom: readonly string[]
): number => {
  let allowed = forgivenTypos(target.length)

  for (const other of distinctFrom) {
    const rival = normalizeAnswer(other)

    while (allowed > 0 && editDistanceWithin(target, rival, allowed)) {
      allowed--
    }
  }

  return allowed
}

const matchesNormalized = (
  target: string,
  attempt: string,
  allowed: number
): boolean => {
  if (target.length === 0 || attempt.length === 0) {
    return false
  }

  if (target === attempt) {
    return true
  }

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
  const target = normalizeAnswer(withoutCatalogueNoise(expected))

  if (target.length === 0) {
    return false
  }

  const spoken = wordsIn(withoutCatalogueNoise(given))

  for (let from = 0; from < spoken.length; from++) {
    let run = ''

    for (let to = from; to < spoken.length; to++) {
      run += spoken[to]

      if (run.length > target.length + MOST_TYPOS_FORGIVEN) {
        break
      }

      if (matchesNormalized(target, run, forgivenTypos(target.length))) {
        return true
      }
    }
  }

  return false
}

const withoutCatalogueNoise = (answer: string): string =>
  answer.replace(CATALOGUE_NOISE, '')

/**
 * The same folding as `normalizeAnswer`, stopping short of dropping the
 * boundaries — `Jean-Jacques` is two words here and one there, and both are
 * right for what each is used for. The article stays too: a run is one word or
 * several, and `the` is one of them.
 */
const wordsIn = (answer: string): string[] =>
  answer
    .normalize('NFD')
    .replace(DIACRITICS, '')
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
