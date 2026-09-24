import { useEffect, useState } from 'react'

/**
 * Whether something has been missing for longer than a blink. A console that
 * drops for a second — a lid, a Wi-Fi hiccup — comes back on its own, and a
 * wall that offered the room to whoever is standing near it every time that
 * happened would be offering it to the room.
 */
export const useAbsentFor = ({
  graceMs,
  isAbsent
}: {
  graceMs: number
  isAbsent: boolean
}): boolean => {
  const [hasWaitedOut, setHasWaitedOut] = useState(false)

  useEffect(() => {
    if (!isAbsent) {
      setHasWaitedOut(false)

      return
    }

    const timer = window.setTimeout(() => setHasWaitedOut(true), graceMs)

    return () => window.clearTimeout(timer)
  }, [graceMs, isAbsent])

  return isAbsent && hasWaitedOut
}
