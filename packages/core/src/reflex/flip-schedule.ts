import { randomIntBetween } from '../helpers/random'

/**
 * How long `playing` runs before the screen flips, drawn afresh every round.
 * Long enough that anticipating it does not pay, short enough that nobody looks
 * away — and a *range* rather than a number because a fixed wait is one a table
 * learns to count out loud by the third round.
 */
export const MIN_FLIP_DELAY_MS = 2_000
export const MAX_FLIP_DELAY_MS = 6_000

export const drawFlipDelayMs = (): number =>
  randomIntBetween(MIN_FLIP_DELAY_MS, MAX_FLIP_DELAY_MS)

/**
 * How long the room has to answer the flip. The round closes the moment
 * everybody has pressed, so this is what covers the one player looking at their
 * drink — a reaction is a third of a second, and three of them is already
 * somebody who did not see it.
 */
export const PRESS_WINDOW_MS = 3_000

/**
 * How long the whole round runs, which only the round can say: the wait is
 * drawn per round, so `roundDurationMsOf` answers `null` for this game and the
 * clock is assembled here instead.
 */
export const reflexRoundDurationMs = (flipDelayMs: number): number =>
  flipDelayMs + PRESS_WINDOW_MS
