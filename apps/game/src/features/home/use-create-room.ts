import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { ShelvedGame } from '@taverla/protocol/game'

import { createRoom } from '@/infrastructure/api/taverla-api'
import { hostPathFor } from '@/infrastructure/router/navigation'
import {
  apiErrorKey,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

/**
 * The one trip to the network either front door makes, and the console it lands
 * on. The shelf's own page opens a room with nothing chosen; a game's page
 * carries which, because a host who came through it has already answered the
 * question the lobby would ask.
 */
export const useCreateRoom = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<PlainTranslationKey | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return {
    error,
    isCreating,
    open: async (game?: ShelvedGame): Promise<void> => {
      setIsCreating(true)
      setError(null)

      const created = await createRoom(game)

      setIsCreating(false)

      if (created.status === 'failure') {
        setError(apiErrorKey(created.error))

        return
      }

      await navigate(hostPathFor(created.data.code))
    }
  }
}
