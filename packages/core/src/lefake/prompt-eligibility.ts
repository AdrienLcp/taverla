/**
 * A prompt written to be read beside its own four candidates. "Which of these
 * characters was considered, but ultimately not included, for Super Smash Bros.
 * Melee?" is a fair quiz question and an impossible Le Fake one: with the
 * candidates gone there is nothing to answer, and nothing to lie about either.
 *
 * It is 12% of the English bank and eight questions of the French, which is the
 * whole reason this filter exists rather than a hand-curated flag column.
 */
const PRESUPPOSES_ITS_CANDIDATES =
  /which of (these|the following)|of the following|lequel de ces|laquelle de ces|lesquels? de ces|lesquelles de ces|parmi ces/iu

/**
 * An answer that is nothing but a number — a year, a count, a percentage. The
 * room can all lie about it and every lie is the same shape, so the board
 * becomes six plausible dates and the vote goes back to being trivia knowledge.
 * This game pays for being believed, and nobody is believed over a number.
 */
const IS_A_BARE_NUMBER = /^[0-9][0-9\s.,'’%-]*$/u

/**
 * Whether a banked question can carry a round of Le Fake. Both exclusions are
 * about the *shape* of the question rather than its subject, which is why this
 * is a rule here and not a column in the bank: the bank is shared with the quiz,
 * where both shapes are perfectly good questions.
 */
export const isEligiblePrompt = ({
  answer,
  prompt
}: {
  answer: string
  prompt: string
}): boolean =>
  !PRESUPPOSES_ITS_CANDIDATES.test(prompt) &&
  !IS_A_BARE_NUMBER.test(answer.trim())
