import { useEffect, useState } from 'react'

import {
  type ClockEstimate,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

/**
 * Whether the reflex race's screen has flipped, and the attribute that repaints
 * the document when it has.
 *
 * Scheduled against this device's own estimate of the server clock rather than
 * on a frame landing: the flip is the stimulus the race is measured from, and a
 * broadcast one would time the room's Wi-Fi instead of the press. On the root
 * element for the same reason `usePhaseField` is — an overscroll bounce shows
 * the document's background and not any component's.
 *
 * Every surface in a reflex round calls this for itself. Two screens agreeing
 * is what the clock handshake is for, and neither is the other's source.
 */
export const useFlipField = ({
  clock,
  flipsAt
}: {
  clock: ClockEstimate | null
  flipsAt: number | null
}): boolean => {
  // The moment it flipped for, not a bare `true`: a pong lands every few
  // seconds and re-runs the schedule below, and a boolean reset there would
  // un-flip a screen mid-heat. Held against `flipsAt`, a new round is already
  // un-flipped before anything runs.
  const [flippedFor, setFlippedFor] = useState<number | null>(null)
  const hasFlipped = flippedFor !== null && flippedFor === flipsAt

  useEffect(() => {
    if (flipsAt === null) {
      return
    }

    let frame = 0

    // A frame callback rather than a timeout: the flip has to land on a paint,
    // and a timeout is free to fire between two of them and be shown late.
    const tick = (): void => {
      if (millisecondsUntil(clock, flipsAt, Date.now()) === 0) {
        setFlippedFor(flipsAt)

        return
      }

      frame = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [clock, flipsAt])

  useEffect(() => {
    if (!hasFlipped) {
      return
    }

    document.documentElement.dataset.flipped = ''

    return () => {
      delete document.documentElement.dataset.flipped
    }
  }, [hasFlipped])

  return hasFlipped
}
