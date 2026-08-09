import type React from 'react'
import { useEffect, useState } from 'react'

import {
  type ClockEstimate,
  millisecondsUntil
} from '@blindtest/core/time/clock-sync'

import './countdown.sass'

type CountdownProps = {
  /** This device's estimate of the server clock; `null` before the first pong. */
  clock: ClockEstimate | null
  className?: string
  /** Server time the countdown lands on, not a duration. */
  target: number
}

/**
 * Counts against the server's clock rather than a local timer started when the
 * message arrived — that difference is the whole point of the handshake. A phone
 * four seconds fast still hits zero with everyone else.
 */
export const Countdown: React.FC<CountdownProps> = ({
  clock,
  className,
  target
}) => {
  const seconds = useSecondsLeft(clock, target)

  return (
    <p
      aria-live='polite'
      className={`countdown ${className ?? ''}`}
      key={seconds}
    >
      {seconds}
    </p>
  )
}

const useSecondsLeft = (
  clock: ClockEstimate | null,
  target: number
): number => {
  const [seconds, setSeconds] = useState(() =>
    toSeconds(millisecondsUntil(clock, target, Date.now()))
  )

  useEffect(() => {
    let frame = 0

    const tick = (): void => {
      setSeconds(toSeconds(millisecondsUntil(clock, target, Date.now())))
      frame = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [clock, target])

  return seconds
}

const toSeconds = (remainingMs: number): number => Math.ceil(remainingMs / 1000)
