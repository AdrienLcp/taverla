export type ClockSample = {
  clientReceivedAt: number
  clientSentAt: number
  serverTime: number
}

export type ClockEstimate = {
  offsetMs: number
  roundTripMs: number
}

/**
 * Cristian's algorithm: the server's clock reading sat halfway through the
 * round trip, so `offset = serverTime + roundTrip / 2 - clientReceivedAt`.
 *
 * That halving assumes the two legs took the same time, which is exactly what
 * a congested network breaks — so the estimate comes from the **shortest**
 * round trip observed, not the average. A slow sample is one where at least one
 * leg was delayed, and averaging drags the estimate toward that noise instead
 * of away from it.
 */
export const estimateClockOffset = (
  samples: readonly ClockSample[]
): ClockEstimate | null => {
  const usable = samples
    .map(toEstimate)
    .filter((estimate) => estimate.roundTripMs >= 0)

  const best = usable.reduce<ClockEstimate | null>(
    (fastest, estimate) =>
      fastest === null || estimate.roundTripMs < fastest.roundTripMs
        ? estimate
        : fastest,
    null
  )

  return best
}

const toEstimate = (sample: ClockSample): ClockEstimate => {
  const roundTripMs = sample.clientReceivedAt - sample.clientSentAt

  return {
    offsetMs: sample.serverTime + roundTripMs / 2 - sample.clientReceivedAt,
    roundTripMs
  }
}

/** The server's clock as this device best understands it. */
export const serverNow = (
  estimate: ClockEstimate | null,
  clientNow: number
): number => clientNow + (estimate?.offsetMs ?? 0)

/**
 * How long this device should wait before a moment the server expressed in its
 * own clock — the countdown, and the `startsAt` the host schedules playback
 * against. Never negative: a target already past means "now", which is why
 * anything measuring time *since* a moment reads `serverNow` instead.
 */
export const millisecondsUntil = (
  estimate: ClockEstimate | null,
  serverTarget: number,
  clientNow: number
): number => Math.max(0, serverTarget - serverNow(estimate, clientNow))
