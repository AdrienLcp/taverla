import type React from 'react'

/**
 * `M` and `W` are the two letters that break the average, so they are the only
 * two counted for more than one. Measured on the rendered node over fifty
 * catalogue titles: every word wider than the face's mean carries one —
 * `MAMMA`, `GANGNAM`, `WOW` — and every word under two thirds of it carries
 * none. Weighting the pair at 1.3 is what keeps the constants that divide this
 * near the mean: the widest word in that sample then asks for `106cqi / n`
 * where a flat character count asks for `91`, so holding every word whole costs
 * the answer four per cent of its size rather than eighteen.
 */
const WIDE_LETTERS = 'MW'
const WIDE_LETTER_WIDTH = 1.3

const widthOf = (run: string): number =>
  [...run].reduce(
    (width, character) =>
      width +
      (WIDE_LETTERS.includes(character.toUpperCase()) ? WIDE_LETTER_WIDTH : 1),
    0
  )

/**
 * The two measurements a stylesheet cannot take of a string it never sees, and
 * both decide whether the answer fits the column it is set in: how much there
 * is of it, and how wide its longest *unbreakable* run is. A hyphen and a space
 * are break opportunities, so `Coca-Cola` is four characters wide rather
 * than nine, and an answer of short words is long without holding any
 * single line hostage.
 *
 * **They are counted in different units, and that is the whole of what a word
 * needs that a paragraph does not.** An average character is the right measure
 * of a paragraph, where fifty letters settle on the mean. It is a coin flip on
 * one word — `ILLINOIS` sets at two thirds of the mean and `MAMMA` at a fifth
 * over it — and the term that promises to hold a word *whole* is the one term
 * that may not be a coin flip. Taken as a plain count it kept that promise on
 * fifty-eight per cent of a fifty-title sample, and `WONDERWALL` came down as
 * `WONDERWAL / L` on a 1440px console. So the length is a count and the run is
 * a width.
 *
 * Both surfaces reveal the same string in a column neither of them owns the
 * width of — the player's screen splits at `$wide-screen` and the console's
 * panel is a fraction of a split stage — so the fact travels with the answer
 * rather than being taken twice.
 */
export const answerFitting = (answer: string): React.CSSProperties => ({
  '--answer-length': answer.length,
  '--longest-word-width': Math.max(1, ...answer.split(/[\s-]+/u).map(widthOf))
})
