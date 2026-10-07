import { classNames } from '@adrienlcp/react'
import type React from 'react'
import { useEffect, useState } from 'react'

import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import { nowMs } from '@/infrastructure/clock'

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
 * message arrived — that difference is the whole point of the handshake. A
 * screen four seconds fast still hits zero with everyone else.
 */
export const Countdown: React.FC<CountdownProps> = ({
  clock,
  className,
  target
}) => {
  const seconds = useSecondsLeft(clock, target)

  return (
    <p aria-live='polite' className={classNames('countdown', className)}>
      <span className='numeral' key={seconds}>
        {seconds}
      </span>
    </p>
  )
}

const useSecondsLeft = (
  clock: ClockEstimate | null,
  target: number
): number => {
  const [seconds, setSeconds] = useState(() =>
    toSeconds(millisecondsUntil(clock, target, nowMs()))
  )

  useEffect(() => {
    let frame = 0

    const tick = (): void => {
      setSeconds(toSeconds(millisecondsUntil(clock, target, nowMs())))
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
