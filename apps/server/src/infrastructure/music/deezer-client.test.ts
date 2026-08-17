import { afterEach, describe, expect, it, vi } from 'vitest'

import { type TrackDifficulty, trackDecades } from '@taverla/protocol/track'

import { fetchTracksFor } from './deezer-client'

/**
 * The ranks are the ones the floors were measured against, spelled out rather
 * than derived from the table under test: 940k is a classic, 300k is the band
 * between the two upper floors, and 8k is what a free-text search returns when
 * nobody released it on purpose.
 */
const CLASSIC_RANK = 940_000
const MIDDLING_RANK = 300_000
const NOISE_RANK = 8_000

const trackAtRank = (rank: number) => ({
  album: { cover_medium: 'https://example.test/cover.jpg' },
  artist: { name: 'Someone' },
  id: String(rank),
  preview: 'https://example.test/preview.mp3',
  rank,
  title: `Rank ${rank}`
})

const namedTrack = (id: string, title: string) => ({
  ...trackAtRank(CLASSIC_RANK),
  id,
  title
})

const catalogueHolding = (tracks: unknown[]): void => {
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(JSON.stringify({ data: tracks }), {
        headers: { 'content-type': 'application/json' },
        status: 200
      })
  )
}

/**
 * Answers each catalogue path from the table and 502s anything absent, which is
 * how a chart that is down is expressed. Returns the paths that were asked for,
 * so a test can assert one request per chosen genre and no more.
 */
const catalogueByPath = (
  bodyByPath: Record<string, unknown[]>
): (() => string[]) => {
  const requested: string[] = []

  vi.stubGlobal('fetch', async (url: string) => {
    const path = url.replace(/^https?:\/\/[^/]+/, '')

    requested.push(path)

    const tracks = bodyByPath[path.split('?')[0] ?? '']

    return tracks === undefined
      ? new Response('', { status: 502 })
      : new Response(JSON.stringify({ data: tracks }), {
          headers: { 'content-type': 'application/json' },
          status: 200
        })
  })

  return () => requested
}

const titlesDrawnAt = async (difficulty: TrackDifficulty) => {
  const found = await fetchTracksFor({
    difficulty,
    source: { kind: 'search', query: 'anything' }
  })

  return found.status === 'success'
    ? found.data.map((track) => track.title)
    : []
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTracksFor', () => {
  it('[difficulty] widens the pool one floor at a time', async () => {
    catalogueHolding([
      trackAtRank(CLASSIC_RANK),
      trackAtRank(MIDDLING_RANK),
      trackAtRank(NOISE_RANK)
    ])

    await expect(titlesDrawnAt('wellKnown')).resolves.toEqual(['Rank 940000'])
    await expect(titlesDrawnAt('mixed')).resolves.toEqual([
      'Rank 940000',
      'Rank 300000'
    ])
    await expect(titlesDrawnAt('obscure')).resolves.toEqual([
      'Rank 940000',
      'Rank 300000'
    ])
  })

  it('[difficulty] keeps a floor even at its most permissive', async () => {
    catalogueHolding([trackAtRank(NOISE_RANK)])

    await expect(titlesDrawnAt('obscure')).resolves.toEqual([])
  })

  it('[difficulty] refuses a track whose score the endpoint did not report', async () => {
    catalogueHolding([{ ...trackAtRank(CLASSIC_RANK), rank: null }])

    await expect(titlesDrawnAt('obscure')).resolves.toEqual([])
  })

  it('[difficulty] refuses a track with no preview, however popular', async () => {
    catalogueHolding([{ ...trackAtRank(CLASSIC_RANK), preview: '' }])

    await expect(titlesDrawnAt('wellKnown')).resolves.toEqual([])
  })

  it('[genres] merges every chosen chart and keeps a shared track once', async () => {
    const requested = catalogueByPath({
      '/chart/132/tracks': [
        namedTrack('a', 'Pop one'),
        namedTrack('c', 'Both')
      ],
      '/chart/152/tracks': [
        namedTrack('b', 'Rock one'),
        namedTrack('c', 'Both')
      ]
    })

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { genreIds: [132, 152], kind: 'chart' }
    })

    expect(
      found.status === 'success' && found.data.map((t) => t.title)
    ).toEqual(['Pop one', 'Both', 'Rock one'])
    expect(requested()).toHaveLength(2)
  })

  it('[genres] reads the all-genres chart when nothing was chosen', async () => {
    const requested = catalogueByPath({
      '/chart/0/tracks': [namedTrack('a', 'Everything')]
    })

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { genreIds: [], kind: 'chart' }
    })

    expect(
      found.status === 'success' && found.data.map((t) => t.title)
    ).toEqual(['Everything'])
    expect(requested()).toEqual(['/chart/0/tracks?limit=100'])
  })

  it('[genres] plays on when one chart of several is down', async () => {
    catalogueByPath({ '/chart/152/tracks': [namedTrack('b', 'Rock one')] })

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { genreIds: [132, 152], kind: 'chart' }
    })

    expect(
      found.status === 'success' && found.data.map((t) => t.title)
    ).toEqual(['Rock one'])
  })

  it('[decades] reads both playlists a decade is made of', async () => {
    const requested = catalogueByPath({
      '/playlist/878989033/tracks': [namedTrack('a', 'Wannabe')],
      '/playlist/1051470831/tracks': [namedTrack('b', 'Alors regarde')]
    })

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { decades: ['1990s'], kind: 'decade' }
    })

    expect(
      found.status === 'success' && found.data.map((t) => t.title)
    ).toEqual(['Wannabe', 'Alors regarde'])
    expect(requested()).toHaveLength(2)
  })

  it('[decades] plays on when one playlist of a decade is withdrawn', async () => {
    catalogueByPath({
      '/playlist/878989033/tracks': [namedTrack('a', 'Wannabe')]
    })

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { decades: ['1990s'], kind: 'decade' }
    })

    expect(
      found.status === 'success' && found.data.map((t) => t.title)
    ).toEqual(['Wannabe'])
  })

  it('[decades] reads every decade when none was chosen', async () => {
    const requested = catalogueByPath({
      '/playlist/878989033/tracks': [namedTrack('a', 'Wannabe')]
    })

    await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { decades: [], kind: 'decade' }
    })

    expect(requested()).toHaveLength(trackDecades.length * 2)
  })

  it('[genres] refuses the round when every chart is down', async () => {
    catalogueByPath({})

    const found = await fetchTracksFor({
      difficulty: 'wellKnown',
      source: { genreIds: [132, 152], kind: 'chart' }
    })

    expect(found).toEqual({
      error: 'music_source_unavailable',
      status: 'failure'
    })
  })
})
