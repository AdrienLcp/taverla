import type React from 'react'
import { useEffect, useState } from 'react'
import { Form } from 'react-aria-components'

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
  chart: 'blindtest.source.chart',
  playlist: 'blindtest.source.playlist',
  search: 'blindtest.source.search'
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
const genreLabelKey = (genreId: GenreId): `blindtest.genre.${GenreId}` =>
  `blindtest.genre.${genreId}`

const PREVIEWED_TITLES = 5

/** What the three source kinds need, all at once, so switching kind keeps what was typed. */
type Draft = {
  genreId: GenreId
  kind: SourceKind
  playlistId: string
  query: string
}

/**
 * The room's settings are the truth on mount, so the picker opens on the source
 * the room is actually running — a genre chosen before a `play again` is still
 * the selected one when the lobby comes back.
 */
const draftFromSource = (source: TrackSource): Draft => ({
  genreId:
    source.kind === 'chart'
      ? (GENRE_IDS.find((id) => id === source.genreId) ?? 0)
      : 0,
  kind: source.kind,
  playlistId: source.kind === 'playlist' ? source.playlistId : '',
  query: source.kind === 'search' ? source.query : ''
})

/** `null` while the chosen kind is still missing the text it needs. */
const sourceFromDraft = ({
  genreId,
  kind,
  playlistId,
  query
}: Draft): TrackSource | null => {
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

type PlaylistPickerProps = {
  /** Called on every edit. Must be stable — it is an effect dependency. */
  onDraftChange: (source: TrackSource | null) => void
  settings: RoomSettings
}

/**
 * A blind test with the wrong decade is a wasted evening, so the pool is chosen
 * before the game starts rather than discovered on the first round.
 *
 * Nothing here commits: starting the game is what sends the source, because a
 * choice that has to be confirmed and *then* launched is two decisions where
 * the host only made one. The search button is the exception, and it only
 * looks — it exists because a query with no visible answer is a guess.
 */
export const PlaylistPicker: React.FC<PlaylistPickerProps> = ({
  onDraftChange,
  settings
}) => {
  const translate = useTranslate()
  const [draft, setDraft] = useState<Draft>(() =>
    draftFromSource(settings.source)
  )
  const [titles, setTitles] = useState<string[] | null>(null)
  const [error, setError] = useState<TranslationKey | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // The control that commits this draft is the one that starts the game, and it
  // lives in the console's footer rather than here.
  useEffect(() => {
    onDraftChange(sourceFromDraft(draft))
  }, [draft, onDraftChange])

  const revise = (patch: Partial<Draft>): void => {
    setDraft({ ...draft, ...patch })
    setTitles(null)
    setError(null)
  }

  const search = async (): Promise<void> => {
    const query = draft.query.trim()

    setError(null)
    setTitles(null)
    setIsSearching(true)

    const found = await searchTracks({
      difficulty: settings.difficulty,
      query
    })

    setIsSearching(false)

    if (found.status === 'failure') {
      setError(apiErrorKey(found.error))

      return
    }

    // Nothing well-known enough matched, so the pool would be empty and the
    // game would fail on its first round instead of here.
    if (found.data.length === 0) {
      setError('blindtest.source.none')

      return
    }

    setTitles(found.data.map((track) => track.title))
  }

  return (
    <section className='playlist-picker'>
      <SegmentedControl
        label={translate('blindtest.source.label')}
        onChange={(next) => {
          if (isSourceKind(next)) {
            revise({ kind: next })
          }
        }}
        options={Object.entries(KIND_LABELS).map(([value, key]) => ({
          label: translate(key),
          value
        }))}
        value={draft.kind}
      />

      {draft.kind === 'chart' && (
        <SegmentedControl
          className='genres'
          label={translate('blindtest.genre.label')}
          onChange={(next) => {
            const chosen = GENRE_IDS.find((id) => String(id) === next)

            if (chosen !== undefined) {
              revise({ genreId: chosen })
            }
          }}
          options={GENRE_IDS.map((id) => ({
            label: translate(genreLabelKey(id)),
            value: String(id)
          }))}
          value={String(draft.genreId)}
        />
      )}

      {draft.kind === 'search' && (
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            void search()
          }}
        >
          <TextField
            label={translate('blindtest.source.query')}
            onChange={(query) => {
              revise({ query })
            }}
            value={draft.query}
          />
          <Button
            isDisabled={draft.query.trim().length === 0}
            isPending={isSearching}
            type='submit'
            variant='ghost'
          >
            {translate('blindtest.source.preview')}
          </Button>
        </Form>
      )}

      {draft.kind === 'playlist' && (
        <TextField
          label={translate('blindtest.source.playlistId')}
          onChange={(playlistId) => {
            revise({ playlistId })
          }}
          value={draft.playlistId}
        />
      )}

      {error !== null && (
        <p className='error' role='alert'>
          {translate(error)}
        </p>
      )}

      {titles !== null && (
        <div className='found'>
          <p className='ready'>
            {translate('blindtest.source.ready', { count: titles.length })}
          </p>
          <ul className='preview'>
            {titles.slice(0, PREVIEWED_TITLES).map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
