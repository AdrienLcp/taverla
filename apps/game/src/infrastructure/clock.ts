/**
 * The only reader of the wall clock: epoch milliseconds, the unit every
 * deadline on the wire and every `setTimeout` here is written in.
 */
export const nowMs = (): number => Date.now()
