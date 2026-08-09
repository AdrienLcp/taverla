import type React from 'react'
import { useState } from 'react'

import type { RoomSettings } from '@taverla/protocol/room'
import type { TrackSource } from '@taverla/protocol/track'

import { searchTracks } from '@/infrastructure/api/taverla-api'
import { Button } from '@/presentation/components/button'
import { SegmentedControl } from '@/presentation/components/segmented-control'
import { TextField } from '@/presentation/components/text-field'
import { useTranslate } from '@/presentation/i18n/i18n-provider'
import {
  apiErrorKey,
  type TranslationKey
} from '@/presentation/i18n/translation'

import './playlist-picker.sass'

type SourceKind = TrackSource['kind']

const KIND_LABELS: Record<SourceKind, TranslationKey> = {
  chart: 'host.source.chart',
  playlist: 'host.source.playlist',
  search: 'host.source.search'
}

const isSourceKind = (value: string): value is SourceKind =>
  value in KIND_LABELS

/**
 * Deezer's own genre ids, hand-picked down to the ones a party actually asks
 * for. Each is a hundred charting tracks, so the whole list is a few thousand
 * songs a room will recognise — see the rank floor in `deezer-client.ts`.
 */
const GENRE_IDS = [
  0, 132, 116, 152, 113, 165, 106, 52, 169, 464, 144, 197
] as const

type GenreId = (typeof GENRE_IDS)[number]

/**
 * The literal return type is load-bearing: adding an id above without adding
 * its label to both dictionaries stops compiling here.
 */
const genreLabelKey = (genreId: GenreId): `host.genre.${GenreId}` =>
  `host.genre.${genreId}`

type PlaylistPickerProps = {
  onChange: (settings: RoomSettings) => void
  settings: RoomSettings
}

/**
 * A blind test with the wrong decade is a wasted evening, so the pool is shown
 * before the game starts rather than discovered on the first round. The preview
 * carries no audio — preview URLs expire, so the server resolves those when a
 * round starts.
 */
export const PlaylistPicker: React.FC<PlaylistPickerProps> = ({
  onChange,
  settings
}) => {
  const translate = useTranslate()
  const [kind, setKind] = useState<SourceKind>(settings.source.kind)
  const [genreId, setGenreId] = useState<GenreId>(0)
  const [query, setQuery] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [preview, setPreview] = useState<string[] | null>(null)
  const [error, setError] = useState<TranslationKey | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const apply = async (): Promise<void> => {
    setError(null)

    const source = buildSource({ genreId, kind, playlistId, query })

    if (source === null) {
      return
    }

    if (source.kind === 'search') {
      setIsChecking(true)

      const found = await searchTracks(source.query)

      setIsChecking(false)

      if (found.status === 'failure') {
        setError(apiErrorKey(found.error))

        return
      }

      // Nothing well-known enough matched, so the pool would be empty and the
      // game would fail on its first round instead of here.
      if (found.data.length === 0) {
        setError('host.source.none')
        setPreview(null)

        return
      }

      setPreview(found.data.slice(0, 5).map((track) => track.title))
    } else {
      setPreview(null)
    }

    onChange({ ...settings, source })
  }

  return (
    <section className='playlist-picker'>
      <SegmentedControl
        label={translate('host.source.label')}
        onChange={(next) => {
          if (isSourceKind(next)) {
            setKind(next)
          }
        }}
        options={Object.entries(KIND_LABELS).map(([value, key]) => ({
          label: translate(key),
          value
        }))}
        value={kind}
      />

      {kind === 'chart' && (
        <SegmentedControl
          className='genres'
          label={translate('host.genre.label')}
          onChange={(next) => {
            const chosen = GENRE_IDS.find((id) => String(id) === next)

            if (chosen !== undefined) {
              setGenreId(chosen)
            }
          }}
          options={GENRE_IDS.map((id) => ({
            label: translate(genreLabelKey(id)),
            value: String(id)
          }))}
          value={String(genreId)}
        />
      )}

      {kind === 'search' && (
        <TextField
          label={translate('host.source.query')}
          onChange={setQuery}
          value={query}
        />
      )}

      {kind === 'playlist' && (
        <TextField
          label={translate('host.source.playlistId')}
          onChange={setPlaylistId}
          value={playlistId}
        />
      )}

      <Button
        isPending={isChecking}
        onPress={() => {
          void apply()
        }}
        variant='outlined'
      >
        {translate('host.source.apply')}
      </Button>

      {error !== null && (
        <p className='error' role='alert'>
          {translate(error)}
        </p>
      )}

      {preview !== null && (
        <ul className='preview'>
          {preview.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

const buildSource = ({
  genreId,
  kind,
  playlistId,
  query
}: {
  genreId: GenreId
  kind: SourceKind
  playlistId: string
  query: string
}): TrackSource | null => {
  switch (kind) {
    case 'chart':
      return { genreId, kind: 'chart' }
    case 'playlist':
      return playlistId.trim().length === 0
        ? null
        : { kind: 'playlist', playlistId: playlistId.trim() }
    case 'search':
      return query.trim().length === 0
        ? null
        : { kind: 'search', query: query.trim() }
  }
}
