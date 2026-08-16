import { MOST_A_SPEED_BONUS_PAYS } from '@taverla/protocol/scoring'

/**
 * What the clock pays a player who scored, from how far into the round they
 * were when they first did. Linear from the whole bonus at nought to nothing
 * when the round runs out, and rounded once at the end — a party scoreline is
 * read out loud, and *4.7 points* is not a number anybody says.
 *
 * **It never pays more than the answer did**, which is what makes the rule one
 * a room can say out loud: being fast doubles what you got, at most. A pick
 * used to be worth 1 and could take 3 on top, so speed was worth three times
 * being right — and the host may change `mode.kind` between two rounds, which
 * put a fast pick at 4 beside a slow typed answer at 3 on the same board.
 *
 * **`elapsedMs` is the round's own clock, never a wall clock.** It stops while
 * the host is away, and a room whose console blinked would otherwise pay the
 * pause: the gap between the answer and the round's start is minutes the player
 * spent waiting for a screen to come back.
 *
 * A game with no round clock has no denominator and pays nothing. Being quickly
 * wrong is priced by not being here at all: this is only ever asked about a
 * player who scored.
 */
export const speedBonusForElapsed = ({
  answerPaid,
  elapsedMs,
  roundDurationMs
}: {
  /** What the answer itself was worth, which is the most the clock may add. */
  answerPaid: number
  /** How far into the round the player first scored. */
  elapsedMs: number
  /** The whole round, or `null` for a game the room cannot run out of. */
  roundDurationMs: number | null
}): number => {
  if (roundDurationMs === null || roundDurationMs <= 0) {
    return 0
  }

  const mostItPays = Math.min(MOST_A_SPEED_BONUS_PAYS, answerPaid)
  const left = 1 - elapsedMs / roundDurationMs

  return Math.round(mostItPays * Math.min(Math.max(left, 0), 1))
}
