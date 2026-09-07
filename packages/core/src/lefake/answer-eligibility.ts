/**
 * An answer that is nothing but a number — a year, a count, a percentage. The
 * room can all lie about it and every lie is the same shape, so the board
 * becomes six plausible dates and the vote goes back to being trivia knowledge.
 * This game pays for being believed, and nobody is believed over a number.
 */
const IS_A_BARE_NUMBER = /^[0-9][0-9\s.,'’%-]*$/u

/**
 * Whether a banked question can carry a round of Le Fake. It is about the
 * *shape* of the answer rather than its subject, which is why it is a rule here
 * and not a column in the bank: the bank is shared with the quiz, where a year
 * is a perfectly good thing to ask for.
 *
 * A prompt that needs its own four candidates is the other exclusion this game
 * wants, and it is **not** here: no rule finds one, so the bank carries
 * `choiceOnly` as a column and the quiz reads it too.
 */
export const canBeLiedAbout = ({ answer }: { answer: string }): boolean =>
  !IS_A_BARE_NUMBER.test(answer.trim())
