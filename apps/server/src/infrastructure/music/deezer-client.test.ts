import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TrackDifficulty } from '@taverla/protocol/track'

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
})
