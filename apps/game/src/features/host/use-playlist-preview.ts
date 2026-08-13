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
 * One value rather than a title list, an error and a flag standing beside each
 * other: those three carried eight combinations for four real states, and left
 * a refusal from the previous query sitting under a fresh result.
 */
export type PlaylistPreview =
  | { error: PlainTranslationKey; status: 'failed' }
  | { status: 'found'; titles: string[] }
  | { status: 'idle' }
  | { status: 'previewing' }

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
  const [preview, setPreview] = useState<PlaylistPreview>({ status: 'idle' })

  const clear = (): void => {
    setPreview({ status: 'idle' })
  }

  const previewSource = async ({
    kind,
    typed
  }: PreviewedSource): Promise<void> => {
    const isPlaylist = kind === 'playlist'

    setPreview({ status: 'previewing' })

    const found = isPlaylist
      ? await fetchPlaylistTracks({ difficulty, playlistId: typed.trim() })
      : await searchTracks({ difficulty, query: typed.trim() })

    if (found.status === 'failure') {
      setPreview({ error: apiErrorKey(found.error), status: 'failed' })

      return
    }

    if (found.data.length === 0) {
      setPreview({
        error: isPlaylist
          ? 'blindtest.source.noneInPlaylist'
          : 'blindtest.source.noneInSearch',
        status: 'failed'
      })

      return
    }

    setPreview({
      status: 'found',
      titles: found.data.map((track) => track.title)
    })
  }

  return { clear, preview, previewSource }
}
