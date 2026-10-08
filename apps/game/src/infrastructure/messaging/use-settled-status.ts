import { useCallback, useEffect, useRef, useState } from 'react'

import type { SocketStatus } from './use-room-socket'

/**
 * A gap shorter than this is a blink rather than a disconnection. It has to
 * outlast one failed attempt and the handshake after it — `RECONNECT_BASE_MS`
 * is 500 — and it must not outlast a host wondering why the room went quiet.
 */
const BLINK_CEILING_MS = 1_000

export type SettledStatus = {
  /**
   * Publishes the held status at once, whatever is left of the blink. A frame
   * that could not be written is the moment the truth is worth more than the
   * calm: the press is gone, and the screen has to say so.
   */
  reveal: () => void
  status: SocketStatus
}

/**
 * Holds a status leaving `open` for a moment before publishing it, because a
 * socket that closes and reopens inside a blink is not a disconnection and
 * saying it is repaints the whole screen. `isLive` on the console disables
 * sixty controls at once, so taking a seat — which reopens the socket to put
 * the name on the next `hello` — inverted every stamp on the page for 60 ms of
 * localhost, and party Wi-Fi does the same without being asked.
 *
 * A refusal is not a gap and goes through untouched: it is the server having
 * said why, and it is final until something changes on this side.
 */
export const useSettledStatus = (status: SocketStatus): SettledStatus => {
  const [settled, setSettled] = useState<SocketStatus>(status)
  // Not `useEffectEvent`, though this is exactly its shape. The hook returns a
  // **fresh closure over a stable ref** on every render, so `reveal` would change
  // identity, take `send`'s `useCallback` in `use-room-socket.ts` with it, and
  // loop every screen holding `send` in a dependency array — `Maximum update
  // depth exceeded`, measured. A callback a hook hands *out* needs the identity
  // an Effect Event does not give.
  const statusRef = useRef(status)
  const blinkTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    statusRef.current = status
  })

  const reveal = useCallback(() => {
    window.clearTimeout(blinkTimerRef.current)
    blinkTimerRef.current = undefined
    setSettled(statusRef.current)
  }, [])

  useEffect(() => {
    // Only a fall *out of* `open` is worth holding, and only once: the retry
    // ladder walks `closed` and `connecting` past here several times, and a
    // timer restarted on each of them would hold a dead socket open for ever.
    if (status === 'open' || status === 'refused' || settled !== 'open') {
      reveal()

      return
    }

    if (blinkTimerRef.current === undefined) {
      blinkTimerRef.current = window.setTimeout(reveal, BLINK_CEILING_MS)
    }
  }, [reveal, settled, status])

  useEffect(
    () => () => {
      window.clearTimeout(blinkTimerRef.current)
    },
    []
  )

  return { reveal, status: settled }
}
