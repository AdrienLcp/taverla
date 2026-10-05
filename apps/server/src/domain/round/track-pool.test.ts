import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BLINDTEST_SETTINGS,
  type GameSettings
} from '@taverla/protocol/game'
import type { TrackSource } from '@taverla/protocol/track'

import { generateHostToken } from '@taverla/core/room/host-token'

import { newRoom } from '@/domain/room/new-room'

import { discardPoolIfStale } from './track-pool'

const playingFrom = (source: TrackSource): GameSettings => ({
  ...DEFAULT_BLINDTEST_SETTINGS,
  source
})

/**
 * Whether the pool a room was already holding survives the settings frame that
 * moved it from one game to another.
 */
const poolSurvives = ({
  from,
  to
}: {
  from: GameSettings | null
  to: GameSettings | null
}): boolean => {
  const room = newRoom({
    code: 'ABCD',
    game: 'blindtest',
    hostToken: generateHostToken(),
    locale: 'en',
    now: 0
  })

  room.settings.game = to
  room.trackPool = [
    {
      artist: 'Daft Punk',
      coverUrl: null,
      film: null,
      id: '1',
      title: 'One More Time'
    }
  ]

  discardPoolIfStale({ previousGame: from, room })

  return room.trackPool.length > 0
}

describe('discardPoolIfStale', () => {
  it('[pool] drops what a genre change no longer asks for', () => {
    expect(
      poolSurvives({
        from: playingFrom({ genreIds: [132], kind: 'chart' }),
        to: playingFrom({ genreIds: [152], kind: 'chart' })
      })
    ).toBe(false)
  })

  it('[pool] drops what a decade change no longer asks for', () => {
    expect(
      poolSurvives({
        from: playingFrom({ decades: ['1990s'], kind: 'decade' }),
        to: playingFrom({ decades: ['1980s'], kind: 'decade' })
      })
    ).toBe(false)
  })

  it('[pool] keeps a pool whose selection only changed order', () => {
    expect(
      poolSurvives({
        from: playingFrom({ genreIds: [132, 152], kind: 'chart' }),
        to: playingFrom({ genreIds: [152, 132], kind: 'chart' })
      })
    ).toBe(true)
  })

  it('[pool] keeps a pool nobody has touched the source of', () => {
    expect(
      poolSurvives({
        from: playingFrom({ decades: ['1990s', '2000s'], kind: 'decade' }),
        to: playingFrom({ decades: ['1990s', '2000s'], kind: 'decade' })
      })
    ).toBe(true)
  })

  it('[pool] drops what a move to the composers no longer asks for', () => {
    expect(
      poolSurvives({
        from: playingFrom({ decades: ['1990s'], kind: 'decade' }),
        to: playingFrom({ kind: 'film' })
      })
    ).toBe(false)
  })

  // The arm carries no choice, so it is only ever itself — there is nothing a
  // host could change about it short of leaving it.
  it('[pool] keeps the composers’ pool, which has nothing to change', () => {
    expect(
      poolSurvives({
        from: playingFrom({ kind: 'film' }),
        to: playingFrom({ kind: 'film' })
      })
    ).toBe(true)
  })

  it('[pool] drops the pool a room left the blind test holding', () => {
    expect(
      poolSurvives({
        from: playingFrom({ genreIds: [], kind: 'chart' }),
        to: null
      })
    ).toBe(false)
  })
})
