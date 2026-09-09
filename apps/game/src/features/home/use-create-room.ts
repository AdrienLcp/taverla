import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'

import { createRoom } from '@/infrastructure/api/taverla-api'
import { hostPathFor } from '@/infrastructure/router/navigation'
import { writeHostToken } from '@/infrastructure/storage/session-storage'
import { useI18n } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

/**
 * Which door a room is being opened through. `null` is the shelf's own — a room
 * with nothing chosen yet — and it is a value rather than an absence: the page
 * draws that door beside five others, and has to tell which of the six is
 * working.
 */
export type RoomDoor = ShelvedGame | null

type RoomOpening =
  | { door: RoomDoor; error: PlainTranslationKey; status: 'refused' }
  | { door: RoomDoor; status: 'opening' }
  | { status: 'idle' }

/**
 * The one trip to the network every front door makes, and the console it lands
 * on. The shelf's own door opens a room with nothing chosen; a game's door
 * carries which, because a host who came through it has already answered the
 * question the lobby would ask.
 *
 * It is one state and not a boolean beside an error, because the page now has
 * six doors sharing this hook and a spinner has to appear on the one that was
 * pressed. That is also what closes the second press: a door already opening a
 * room refuses to open another, and no card has to be disabled to say so.
 */
export const useCreateRoom = () => {
  const navigate = useNavigate()
  const { locale } = useI18n()
  const [opening, setOpening] = useState<RoomOpening>({ status: 'idle' })

  return {
    isOpening: (door: RoomDoor): boolean =>
      opening.status === 'opening' && opening.door === door,
    open: async (door: RoomDoor): Promise<void> => {
      if (opening.status === 'opening') {
        return
      }

      setOpening({ door, status: 'opening' })

      const created = await createRoom({ game: door ?? undefined, locale })

      if (created.status === 'failure') {
        setOpening({
          door,
          error: apiErrorKey(created.error),
          status: 'refused'
        })

        return
      }

      writeHostToken({
        hostToken: created.data.hostToken,
        roomCode: created.data.code
      })

      await navigate(hostPathFor(created.data.code))
    },
    /**
     * The refusal and the door that met it. Every cause is the room service
     * rather than the game — a rate limit, a dead network — so the shelf draws
     * one message for its five cards and reads the door only to know it is not
     * the one above them.
     */
    refusal: opening.status === 'refused' ? opening : null
  }
}
