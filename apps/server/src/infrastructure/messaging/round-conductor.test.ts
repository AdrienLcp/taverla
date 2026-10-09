import { Result } from '@adrienlcp/result'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HostTrack } from '@taverla/protocol/track'

import { generateHostToken } from '@taverla/core/room/host-token'

import { newRoom } from '@/domain/room/new-room'
import type { Room } from '@/domain/room/room'
import {
  finishGame,
  openRound,
  revealRound,
  TRACK_DRAW_LEAD_MS
} from '@/domain/round/round-service'
import type { drawPlayableTrack } from '@/domain/round/track-pool'
import {
  type MusicSourceFailure,
  NOTHING_PLAYABLE
} from '@/infrastructure/music/music-source'

import type { Connection } from './connection'
import { commitRoom, createRoomEngine, deadlinesOf } from './room-engine'
import { wakeRoom } from './round-conductor'

type DrawOutcome = Awaited<ReturnType<typeof drawPlayableTrack>>

const draw = vi.hoisted(() => ({
  next: (): Promise<DrawOutcome> => Promise.reject(new Error('unset draw'))
}))

vi.mock('@/domain/round/track-pool', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/domain/round/track-pool')>()),
  drawPlayableTrack: () => draw.next()
}))

const OPENED_AT = 1_000_000
const COUNTDOWN_MS = 3_000
const HOLD_MS = 8_000
const REVEALED_AT = OPENED_AT + 20_000
const HELD_UNTIL = REVEALED_AT + HOLD_MS
const DRAW_DUE_AT = HELD_UNTIL - COUNTDOWN_MS - TRACK_DRAW_LEAD_MS
const OPENS_AT = HELD_UNTIL - COUNTDOWN_MS

const FIRST_TRACK: HostTrack = {
  artist: 'Daft Punk',
  coverUrl: null,
  film: null,
  id: '1',
  previewUrl: 'https://preview.test/1.mp3',
  title: 'Around the World'
}

const NEXT_TRACK: HostTrack = {
  artist: 'Justice',
  coverUrl: null,
  film: null,
  id: '2',
  previewUrl: 'https://preview.test/2.mp3',
  title: 'Genesis'
}

const OUTAGE: MusicSourceFailure = {
  code: 'music_source_unavailable',
  faults: [{ detail: '503', kind: 'http_error', path: '/chart/0/tracks' }]
}

const host: Connection = {
  playerId: null,
  role: 'host',
  send: () => {},
  sessionId: 'host-session'
}

const revealedBlindtest = (): Room => {
  const room = newRoom({
    code: 'ABCD',
    game: 'blindtest',
    hostToken: generateHostToken(),
    locale: 'fr',
    now: OPENED_AT
  })

  room.settings.countdownMs = COUNTDOWN_MS
  room.settings.autoAdvanceMs = HOLD_MS
  room.settings.roundCount = 10

  openRound({
    content: {
      choices: [],
      correctChoiceIndex: null,
      kind: 'blindtest',
      track: FIRST_TRACK
    },
    id: 'round-1',
    now: OPENED_AT,
    room
  })
  revealRound(room, REVEALED_AT)

  return room
}

/** A room on a clock the test moves, woken when it asked to be, as an alarm would. */
const heldRoom = () => {
  const clock = { now: REVEALED_AT }
  const wakes: (number | null)[] = []
  const engine = createRoomEngine(revealedBlindtest(), {
    connections: { add: () => {}, all: () => [host], remove: () => {} },
    discard: () => {},
    now: () => clock.now,
    persist: () => {},
    wakeAt: (wakeAt) => {
      wakes.push(wakeAt)
    }
  })

  commitRoom(engine)

  return {
    clock,
    engine,
    fire: (): Promise<void> => {
      clock.now = wakes.at(-1) ?? clock.now

      return wakeRoom(engine)
    },
    nextWake: () => wakes.at(-1) ?? null
  }
}

const trackIdOf = (room: Room): string | null =>
  room.round?.content.kind === 'blindtest' ? room.round.content.track.id : null

const deferredDraw = () => {
  let settle: (outcome: DrawOutcome) => void = () => {}
  const pending = new Promise<DrawOutcome>((resolve) => {
    settle = resolve
  })

  draw.next = () => pending

  return { settle }
}

describe('a held blind test drawing its next track', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('[hold] starts drawing a countdown and a draw lead before the next clip', () => {
    const held = heldRoom()

    expect(held.nextWake()).toBe(DRAW_DUE_AT)
  })

  it('[hold] waits for the countdown to be due before opening a track that landed early, and starts it on the hold', async () => {
    const held = heldRoom()

    draw.next = async () => Result.success({ faults: [], track: NEXT_TRACK })

    const firing = held.fire()

    await vi.advanceTimersByTimeAsync(OPENS_AT - DRAW_DUE_AT - 1)

    expect(held.engine.room.phase).toBe('revealed')
    expect(held.engine.room.round?.index).toBe(1)

    held.clock.now = OPENS_AT
    await vi.advanceTimersByTimeAsync(1)
    await firing

    expect(held.engine.room.phase).toBe('countdown')
    expect(held.engine.room.round?.index).toBe(2)
    expect(held.engine.room.round?.startsAt).toBe(HELD_UNTIL)
  })

  it('[hold] opens nothing when the host left while the track was being drawn', async () => {
    const held = heldRoom()
    const { settle } = deferredDraw()

    const firing = held.fire()

    if (held.engine.room.round !== null) {
      held.engine.room.round.advancesAt = null
    }

    settle(Result.success({ faults: [], track: NEXT_TRACK }))
    await vi.advanceTimersByTimeAsync(HOLD_MS)
    await firing

    expect(held.engine.room.phase).toBe('revealed')
    expect(held.engine.room.round?.index).toBe(1)
  })

  it('[hold] opens nothing when the game ended while the track was being drawn', async () => {
    const held = heldRoom()
    const { settle } = deferredDraw()

    const firing = held.fire()

    finishGame(held.engine.room, held.clock.now)
    settle(Result.success({ faults: [], track: NEXT_TRACK }))
    await vi.advanceTimersByTimeAsync(HOLD_MS)
    await firing

    expect(held.engine.room.phase).toBe('finished')
    expect(held.engine.room.round).toBeNull()
  })

  it('[hold] tries again by itself after a catalogue outage, and opens the round then', async () => {
    const held = heldRoom()

    draw.next = async () => Result.failure(OUTAGE)

    await held.fire()

    expect(held.engine.room.phase).toBe('revealed')
    expect(held.engine.room.round?.advancesAt).not.toBeNull()

    const retriesAt = held.nextWake()

    expect(retriesAt).toBeGreaterThan(DRAW_DUE_AT)

    draw.next = async () => Result.success({ faults: [], track: NEXT_TRACK })

    const firing = held.fire()

    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS + TRACK_DRAW_LEAD_MS)
    await firing

    expect(held.engine.room.phase).toBe('countdown')
    expect(trackIdOf(held.engine.room)).toBe(NEXT_TRACK.id)
  })

  it('[hold] draws once for one round when the room is committed while the drawn track waits to open', async () => {
    const held = heldRoom()
    let draws = 0

    draw.next = async () => {
      draws += 1

      return Result.success({ faults: [], track: NEXT_TRACK })
    }

    const firing = held.fire()

    await vi.advanceTimersByTimeAsync(1)
    commitRoom(held.engine)

    const refiring = held.fire()

    held.clock.now = OPENS_AT
    await vi.advanceTimersByTimeAsync(OPENS_AT - DRAW_DUE_AT)
    await Promise.all([firing, refiring])

    expect(draws).toBe(1)
    expect(held.engine.room.phase).toBe('countdown')
    expect(held.engine.room.round?.index).toBe(2)
  })

  it('[hold] spends the hold when the source has nothing left to play', async () => {
    const held = heldRoom()

    draw.next = async () => Result.failure(NOTHING_PLAYABLE)

    await held.fire()

    expect(held.engine.room.phase).toBe('revealed')
    expect(held.engine.room.round?.advancesAt).toBeNull()
    expect(
      deadlinesOf(held.engine).some((deadline) => deadline.kind === 'advance')
    ).toBe(false)
  })
})
