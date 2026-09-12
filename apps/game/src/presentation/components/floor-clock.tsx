import type React from 'react'
import { useEffect, useState } from 'react'

import type { ActiveBuzz } from '@taverla/protocol/room'

import {
  type ClockEstimate,
  millisecondsUntil,
  serverNow
} from '@taverla/core/time/clock-sync'

import './floor-clock.sass'

type FloorClockProps = {
  /** Who took the floor and when the server takes it back. */
  buzz: ActiveBuzz
  /** This device's estimate of the server clock; `null` before the first pong. */
  clock: ClockEstimate | null
}

/**
 * How long the floor has been held, or how long is left of it. Both are the
 * same clock read from opposite ends, so they are one component: a room with a
 * window watches it run out, and a room without one watches the silence add up
 * until the host cuts in.
 *
 * Counted against the server's clock rather than a local timer started when the
 * frame arrived, for the same reason the countdown is — otherwise the host's
 * screen and the buzzing player disagree about how long someone has been quiet.
 */
export const FloorClock: React.FC<FloorClockProps> = ({ buzz, clock }) => {
  const seconds = useFloorSeconds(buzz, clock)

  return (
    <p
      className={`floor-clock ${buzz.expiresAt === null ? 'open' : 'closing'}`}
      role='timer'
      // A reading of unknown length publishes its length, the way an answer
      // and a question do: one digit and three are the same fact, and only a
      // surface fitting this into a box of its own can say what that costs.
      // Ignored where the number is a line in a column.
      style={{ '--reading-length': String(seconds).length }}
    >
      {seconds}
    </p>
  )
}

/**
 * `millisecondsUntil` is clamped at zero — a target already past means "now" —
 * so it answers the closing direction and cannot answer the open one. Counting
 * up reads the server's clock directly instead.
 */
const floorSeconds = ({
  atServerTime,
  clock,
  expiresAt
}: {
  atServerTime: number
  clock: ClockEstimate | null
  expiresAt: number | null
}): number =>
  expiresAt === null
    ? Math.max(
        0,
        Math.floor((serverNow(clock, Date.now()) - atServerTime) / 1_000)
      )
    : Math.ceil(millisecondsUntil(clock, expiresAt, Date.now()) / 1_000)

const useFloorSeconds = (
  buzz: ActiveBuzz,
  clock: ClockEstimate | null
): number => {
  const { atServerTime, expiresAt } = buzz
  const [seconds, setSeconds] = useState(() =>
    floorSeconds({ atServerTime, clock, expiresAt })
  )

  useEffect(() => {
    let frame = 0

    const tick = (): void => {
      setSeconds(floorSeconds({ atServerTime, clock, expiresAt }))
      frame = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [atServerTime, clock, expiresAt])

  return seconds
}
