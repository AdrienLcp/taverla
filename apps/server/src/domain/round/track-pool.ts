import type { BlindtestSettings, GameSettings } from '@taverla/protocol/game'
import type {
  HostTrack,
  TrackIdentity,
  TrackSource
} from '@taverla/protocol/track'

import { Result } from '@taverla/core/helpers/result'

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

export const drawPlayableTrack = async ({
  room,
  settings
}: {
  room: Room
  settings: BlindtestSettings
}): Promise<Result<HostTrack, MusicSourceError>> => {
  for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS; attempt++) {
    const refilled = await refillWhenEmpty({ room, settings })

    if (refilled.status === 'failure') {
      return refilled
    }

    const candidate = takeRandom(room.trackPool)

    if (candidate === null) {
      return Result.failure('no_content_available')
    }

    room.playedContentIds.add(candidate.id)

    const resolved = await fetchHostTrack(candidate.id)

    if (resolved.status === 'success') {
      return resolved
    }
  }

  return Result.failure('no_content_available')
}

/**
 * A pool left over from a source the host has just replaced would keep serving
 * the old catalogue for the rest of the game, so it is dropped — but only when
 * the source really changed, since refilling costs a request.
 *
 * A room that left the blind test altogether has no use for the pool either,
 * and one that comes back to it should not inherit the tracks a source chosen
 * two games ago put there.
 */
export const discardPoolIfStale = ({
  previousGame,
  room
}: {
  previousGame: GameSettings | null
  room: Room
}): void => {
  const game = room.settings.game

  const isStale =
    game?.kind !== 'blindtest' ||
    previousGame?.kind !== 'blindtest' ||
    !isSameSource(previousGame.source, game.source)

  if (isStale) {
    room.trackPool = []
  }
}

const isSameSource = (left: TrackSource, right: TrackSource): boolean => {
  switch (left.kind) {
    case 'chart':
      return (
        right.kind === 'chart' && holdsTheSame(left.genreIds, right.genreIds)
      )
    case 'decade':
      return (
        right.kind === 'decade' && holdsTheSame(left.decades, right.decades)
      )
    case 'playlist':
      return right.kind === 'playlist' && left.playlistId === right.playlistId
    case 'search':
      return right.kind === 'search' && left.query === right.query
  }
}

/**
 * Order is not part of the question: a strip hands back what is selected in the
 * order it was clicked, and two hosts who picked rock and then pop are asking
 * for what one who picked pop and then rock is asking for.
 */
const holdsTheSame = <TItem>(
  left: readonly TItem[],
  right: readonly TItem[]
): boolean => {
  const held = new Set(left)
  const wanted = new Set(right)

  return (
    held.size === wanted.size && [...wanted].every((item) => held.has(item))
  )
}

const refillWhenEmpty = async ({
  room,
  settings
}: {
  room: Room
  settings: BlindtestSettings
}): Promise<Result<void, MusicSourceError>> => {
  if (room.trackPool.length > 0) {
    return Result.success(undefined)
  }

  const fetched = await fetchTracksFor({
    difficulty: settings.difficulty,
    source: settings.source
  })

  if (fetched.status === 'failure') {
    return fetched
  }

  const unplayed = fetched.data.filter(
    (track) => !room.playedContentIds.has(track.id)
  )

  if (unplayed.length === 0) {
    return Result.failure('no_content_available')
  }

  room.trackPool = unplayed

  return Result.success(undefined)
}

/** Four is the shape of the question: enough to be a guess, few enough to read. */
const CHOICES_PER_ROUND = 4

/**
 * The decoys come from the room's own pool, which is the genres the host chose.
 * Drawing them from anywhere else hands the answer over for free — three
 * seventies soul tracks beside one chart pop song is not a question, it is a
 * spot-the-odd-one-out.
 *
 * The pool is read rather than drained: a decoy is still an unplayed track, and
 * spending it here would burn the catalogue three times as fast.
 */
export const drawChoices = ({
  room,
  track
}: {
  room: Room
  track: HostTrack
}): { choices: TrackIdentity[]; correctIndex: number } => {
  const answer: TrackIdentity = {
    artist: track.artist,
    coverUrl: track.coverUrl,
    id: track.id,
    title: track.title
  }

  const decoys = shuffled(
    room.trackPool.filter((candidate) => candidate.id !== track.id)
  ).slice(0, CHOICES_PER_ROUND - 1)

  const choices = shuffled([answer, ...decoys])

  return {
    choices,
    correctIndex: choices.findIndex((choice) => choice.id === track.id)
  }
}

const shuffled = <TItem>(items: readonly TItem[]): TItem[] => {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1))
    const held = copy[index]
    const other = copy[swap]

    if (held !== undefined && other !== undefined) {
      copy[index] = other
      copy[swap] = held
    }
  }

  return copy
}

const takeRandom = <TItem>(items: TItem[]): TItem | null => {
  if (items.length === 0) {
    return null
  }

  const [drawn] = items.splice(Math.floor(Math.random() * items.length), 1)

  return drawn ?? null
}
