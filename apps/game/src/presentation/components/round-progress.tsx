import type React from 'react'

import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import './round-progress.sass'

type RoundProgressProps = {
  /** How long the round runs for, from the game whose round it is. */
  durationMs: number
  /**
   * Round time already consumed, buzz pauses excluded. The server's own count,
   * which is what makes this the room's clock rather than each device's.
   */
  elapsedMs: number
}

/**
 * How much of the round is left, drained by a CSS animation rather than a React
 * timer: the server has already decided when this ends, so a per-frame render
 * would only add work.
 *
 * It starts at the fraction still standing rather than at full, which is what
 * lets a screen arriving mid-round — a phone back from a lock, a host who
 * reloaded — show where the room is instead of promising a whole clip.
 */
export const RoundProgress: React.FC<RoundProgressProps> = ({
  durationMs,
  elapsedMs
}) => {
  const remainingMs = Math.max(0, durationMs - elapsedMs)

  return (
    <div
      className='round-progress'
      // A running animation cannot be re-aimed: moving its duration or its
      // starting point rebases what it has already played, and the bar jumps.
      // Re-keying restarts it from the snapshot's truth, which is where it had
      // drained to anyway — so the correction is invisible.
      key={remainingMs}
      style={{
        '--drain-duration': `${remainingMs}ms`,
        '--drain-from': (remainingMs / durationMs).toFixed(3)
      }}
    />
  )
}

type RevealHoldProps = {
  /** Server time the reveal gives way to the next round. */
  advancesAt: number
  /** This device's estimate of the server clock; `null` before the first pong. */
  clock: ClockEstimate | null
  /** The whole wait, from the setting its deadline was stamped against. */
  holdMs: number
}

/**
 * The same bar, counting the wait between a reveal and the round after it. The
 * hold travels as a deadline rather than as time already spent — the server
 * cancels and restarts it along with the round — so this is where it becomes
 * the two numbers the bar draws with, once rather than on each screen.
 *
 * `Date.now()` in the render body is the point rather than an oversight: the
 * reading is taken once per snapshot and the animation carries the drain in
 * between, which is the same bargain the round's bar makes with the server's
 * own count.
 */
export const RevealHold: React.FC<RevealHoldProps> = ({
  advancesAt,
  clock,
  holdMs
}) => (
  <RoundProgress
    durationMs={holdMs}
    elapsedMs={holdMs - millisecondsUntil(clock, advancesAt, Date.now())}
  />
)
