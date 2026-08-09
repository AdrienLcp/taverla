import type { HostTrack } from '@blindtest/protocol/track'

import { Result } from '@blindtest/core/helpers/result'

import type { Room } from '@/domain/room/room'
import {
  fetchHostTrack,
  fetchTracksFor,
  type MusicSourceError
} from '@/infrastructure/music/deezer-client'

/**
 * A drawn candidate can still turn out to have no preview in this country, and
 * the answer to that is another draw rather than a dead round. Bounded so a
 * source that is entirely unplayable fails instead of walking its whole pool.
 */
const MAX_DRAW_ATTEMPTS = 5

export const drawPlayableTrack = async (
  room: Room
): Promise<Result<HostTrack, MusicSourceError>> => {
  for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS; attempt++) {
    const refilled = await refillWhenEmpty(room)

    if (refilled.status === 'failure') {
      return refilled
    }

    const candidate = takeRandom(room.trackPool)

    if (candidate === null) {
      return Result.failure('no_tracks_available')
    }

    room.playedTrackIds.add(candidate.id)

    const resolved = await fetchHostTrack(candidate.id)

    if (resolved.status === 'success') {
      return resolved
    }
  }

  return Result.failure('no_tracks_available')
}

/** Called when the host changes the source, so the next draw comes from the new one. */
export const discardPool = (room: Room): void => {
  room.trackPool = []
}

const refillWhenEmpty = async (
  room: Room
): Promise<Result<void, MusicSourceError>> => {
  if (room.trackPool.length > 0) {
    return Result.success(undefined)
  }

  const fetched = await fetchTracksFor(room.settings.source)

  if (fetched.status === 'failure') {
    return fetched
  }

  const unplayed = fetched.data.filter(
    (track) => !room.playedTrackIds.has(track.id)
  )

  if (unplayed.length === 0) {
    return Result.failure('no_tracks_available')
  }

  room.trackPool = unplayed

  return Result.success(undefined)
}

const takeRandom = <TItem>(items: TItem[]): TItem | null => {
  if (items.length === 0) {
    return null
  }

  const [drawn] = items.splice(Math.floor(Math.random() * items.length), 1)

  return drawn ?? null
}
