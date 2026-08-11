import { useState } from 'react'

import type { TrackDifficulty, TrackSource } from '@taverla/protocol/track'

import {
  fetchPlaylistTracks,
  searchTracks
} from '@/infrastructure/api/taverla-api'
import {
  apiErrorKey,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

type PreviewedSource = {
  kind: TrackSource['kind']
  typed: string
}

/**
 * A look at what a query or a playlist id would draw, and the picker's only
 * trip to the network — nothing here commits, because the round that opens is
 * what sends the source.
 *
 * Its whole reason to exist is that an empty pool must be found *now*: a
 * playlist of songs the difficulty floor rejects fails on the first round of
 * the party otherwise, with the room watching.
 */
export const usePlaylistPreview = (difficulty: TrackDifficulty) => {
  const [titles, setTitles] = useState<string[] | null>(null)
  const [error, setError] = useState<PlainTranslationKey | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const clear = (): void => {
    setTitles(null)
    setError(null)
  }

  const preview = async ({ kind, typed }: PreviewedSource): Promise<void> => {
    const isPlaylist = kind === 'playlist'

    clear()
    setIsPreviewing(true)

    const found = isPlaylist
      ? await fetchPlaylistTracks({ difficulty, playlistId: typed.trim() })
      : await searchTracks({ difficulty, query: typed.trim() })

    setIsPreviewing(false)

    if (found.status === 'failure') {
      setError(apiErrorKey(found.error))

      return
    }

    if (found.data.length === 0) {
      setError(
        isPlaylist
          ? 'blindtest.source.noneInPlaylist'
          : 'blindtest.source.noneInSearch'
      )

      return
    }

    setTitles(found.data.map((track) => track.title))
  }

  return { clear, error, isPreviewing, preview, titles }
}
