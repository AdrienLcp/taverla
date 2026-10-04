import type { RoomCreationLimiter } from '@/infrastructure/http/rate-limit'

/**
 * The binding's stand-in for the socket suites: a count per key that never
 * resets, because no suite outlives one window.
 */
export const inProcessRoomCreationLimiter = (
  allowance: number
): RoomCreationLimiter => {
  const counts = new Map<string, number>()

  return {
    limit: async ({ key }) => {
      const count = (counts.get(key) ?? 0) + 1

      counts.set(key, count)

      return { success: count <= allowance }
    }
  }
}
