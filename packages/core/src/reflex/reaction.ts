/**
 * The shortest gap between the screen flipping and a press arriving that could
 * be a reaction to it. Human simple reaction to a visual stimulus does not go
 * below about 150 ms, so the floor costs an honest player nothing.
 *
 * It is what lets `flipsAt` travel in advance, which every device needs in order
 * to flip on its own clock rather than on a frame landing. A scripted press
 * scheduled for the flip arrives too early to be accepted and is refused as a
 * false start; only jitter could save it, and jitter is not a strategy.
 */
export const FALSE_START_FLOOR_MS = 100

export type ReactionMoment = {
  flipsAt: number
  pressedAt: number
}

/** Negative for a press that beat the flip, which is what lets one rule cover both. */
export const reactionMsOf = ({ flipsAt, pressedAt }: ReactionMoment): number =>
  pressedAt - flipsAt

export const isFalseStart = (moment: ReactionMoment): boolean =>
  reactionMsOf(moment) < FALSE_START_FLOOR_MS
