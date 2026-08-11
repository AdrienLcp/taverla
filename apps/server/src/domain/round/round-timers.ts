import type { RoomCode } from '@taverla/protocol/identifiers'

/**
 * The transitions a round makes on its own rather than on a message. They are
 * named rather than counted so that arming one always replaces the previous one
 * of the same kind — a countdown restarted mid-flight must not leave the first
 * one running.
 */
export type RoundTimerKind = 'advance' | 'answer' | 'countdown' | 'round'

const timersByRoom = new Map<
  RoomCode,
  Map<RoundTimerKind, ReturnType<typeof setTimeout>>
>()

export const scheduleRoundTimer = ({
  code,
  delayMs,
  kind,
  run
}: {
  code: RoomCode
  delayMs: number
  kind: RoundTimerKind
  run: () => void
}): void => {
  cancelRoundTimer(code, kind)

  const timers = timersByRoom.get(code) ?? new Map()

  timers.set(
    kind,
    setTimeout(
      () => {
        timers.delete(kind)
        run()
      },
      Math.max(0, delayMs)
    )
  )

  timersByRoom.set(code, timers)
}

export const cancelRoundTimer = (
  code: RoomCode,
  kind: RoundTimerKind
): void => {
  const timers = timersByRoom.get(code)
  const timer = timers?.get(kind)

  if (timer === undefined) {
    return
  }

  clearTimeout(timer)
  timers?.delete(kind)
}

/** A room that ends or is swept cancels everything it owns, in one call. */
export const cancelRoundTimers = (code: RoomCode): void => {
  for (const timer of timersByRoom.get(code)?.values() ?? []) {
    clearTimeout(timer)
  }

  timersByRoom.delete(code)
}
