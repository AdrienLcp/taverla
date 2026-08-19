import { useRef, useState } from 'react'

import type { CatalogueTrack } from '@taverla/protocol/http'
import type { TrackDifficulty, TrackSource } from '@taverla/protocol/track'

import { whatTheRoomNames } from '@taverla/core/blindtest/typed-answer'
import type { Result } from '@taverla/core/helpers/result'

import {
  type ApiError,
  fetchDecadeTracks,
  fetchFilmTracks,
  fetchPlaylistTracks,
  searchTracks
} from '@/infrastructure/api/taverla-api'
import {
  apiErrorKey,
  type PlainTranslationKey
} from '@/presentation/i18n/translation'

/**
 * Every source but the chart, which is Deezer's own front page: it cannot come
 * back empty, and there is nothing about it a host could have got wrong.
 */
type PreviewableSource = Exclude<TrackSource, { kind: 'chart' }>

/**
 * One value rather than a title list, an error and a flag standing beside each
 * other: those three carried eight combinations for four real states, and left
 * a refusal from the previous query sitting under a fresh result.
 */
export type PlaylistPreview =
  | { error: PlainTranslationKey; status: 'failed' }
  | { count: number; status: 'found'; titles: string[] }
  | { status: 'idle' }
  | { status: 'previewing' }

const EMPTY_RESULT_KEYS: Record<
  PreviewableSource['kind'],
  PlainTranslationKey
> = {
  decade: 'blindtest.source.noneInDecade',
  film: 'blindtest.source.noneInFilms',
  playlist: 'blindtest.source.noneInPlaylist',
  search: 'blindtest.source.noneInSearch'
}

/**
 * What the list shows, as against what the pool holds — which is why the count
 * beside it is the pool's and is not read off this.
 *
 * One film is a dozen cues and two pressings of it differ only in their
 * capitals, so a straight list gave five rows of `Les Choses De La Vie` and two
 * React keys that collided. A repeat is a thinner *preview*, never a thinner
 * pool: the round draws a cue, and a second cue of the same film is a second
 * round.
 */
const distinctNames = (tracks: readonly CatalogueTrack[]): string[] => {
  const byFoldedName = new Map<string, string>()

  for (const track of tracks) {
    const name = whatTheRoomNames(track)

    if (!byFoldedName.has(name.toLowerCase())) {
      byFoldedName.set(name.toLowerCase(), name)
    }
  }

  return [...byFoldedName.values()]
}

const catalogueFor = async ({
  difficulty,
  source
}: {
  difficulty: TrackDifficulty
  source: PreviewableSource
}): Promise<Result<CatalogueTrack[], ApiError>> => {
  switch (source.kind) {
    case 'decade':
      return fetchDecadeTracks({ decades: source.decades, difficulty })
    case 'film':
      return fetchFilmTracks()
    case 'playlist':
      return fetchPlaylistTracks({ difficulty, playlistId: source.playlistId })
    case 'search':
      return searchTracks({ difficulty, query: source.query })
  }
}

/**
 * A look at what a decade, a query or a playlist id would draw, and the
 * picker's only trip to the network — nothing here commits, because the round
 * that opens is what sends the source.
 *
 * Its whole reason to exist is that an empty pool must be found *now*: a
 * playlist of songs the difficulty floor rejects fails on the first round of
 * the party otherwise, with the room watching.
 */
export const usePlaylistPreview = (difficulty: TrackDifficulty) => {
  const [preview, setPreview] = useState<PlaylistPreview>({ status: 'idle' })
  // The decade strip asks on every press, so two answers can be in flight at
  // once and the slower one is not the older one. Unguarded, a stale result
  // lands on top of a fresh one and the host reads a catalogue they left.
  const latestAsked = useRef(0)

  const clear = (): void => {
    latestAsked.current += 1

    setPreview({ status: 'idle' })
  }

  const previewSource = async (source: PreviewableSource): Promise<void> => {
    latestAsked.current += 1

    const asked = latestAsked.current

    setPreview({ status: 'previewing' })

    const found = await catalogueFor({ difficulty, source })

    if (asked !== latestAsked.current) {
      return
    }

    if (found.status === 'failure') {
      setPreview({ error: apiErrorKey(found.error), status: 'failed' })

      return
    }

    if (found.data.length === 0) {
      setPreview({
        error: EMPTY_RESULT_KEYS[source.kind],
        status: 'failed'
      })

      return
    }

    setPreview({
      count: found.data.length,
      status: 'found',
      titles: distinctNames(found.data)
    })
  }

  return { clear, preview, previewSource }
}
