import { useEffect, useState } from 'react'

import type { HeldRoom } from '@taverla/core/room/session-memory'

import { roomExists } from '@/infrastructure/api/taverla-api'
import {
  forgetRoom,
  readHeldRooms
} from '@/infrastructure/storage/session-storage'

/**
 * The rooms this device can walk back into, resolved before any of them is
 * offered. The memory lasts a day and a room can be gone in ten minutes, so
 * what the store holds is a list of candidates rather than a list of rooms.
 *
 * **Nothing is drawn before the answers land.** The lookup returns a bare
 * boolean, so there is nothing to enrich a row with afterwards — a row put up
 * early would be an offer withdrawn, which is the ghost this check exists to
 * prevent. Every candidate is asked at once, so the wait is one round trip
 * rather than four.
 *
 * **A lookup that fails is not a refusal.** Only `exists: false` says a room has
 * gone; a request that never landed says nothing at all, and withholding the
 * door then is the failure this whole door was built to fix. So an unanswered
 * candidate is still offered, and the room page's own refusal screen is what
 * says so if it turns out to be dead. Only a confirmed absence prunes the store.
 */
export const useHeldRooms = (): HeldRoom[] => {
  const [held] = useState(readHeldRooms)
  const [stillOpen, setStillOpen] = useState<HeldRoom[]>([])

  useEffect(() => {
    if (held.length === 0) {
      return
    }

    let isCurrent = true

    const resolveEach = async (): Promise<void> => {
      const answers = await Promise.all(
        held.map(async (room) => ({
          found: await roomExists(room.roomCode),
          room
        }))
      )

      for (const { found, room } of answers) {
        if (found.status === 'success' && !found.data) {
          forgetRoom(room.roomCode)
        }
      }

      if (isCurrent) {
        setStillOpen(
          answers
            .filter(({ found }) => found.status === 'failure' || found.data)
            .map(({ room }) => room)
        )
      }
    }

    void resolveEach()

    return () => {
      isCurrent = false
    }
  }, [held])

  return stillOpen
}
