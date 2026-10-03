import { describe, expect, it } from 'vitest'

import { newRoom } from '@/domain/room/new-room'
import type { Room } from '@/domain/room/room'
import { ABANDONED_ROOM_GRACE_MS } from '@/domain/room/room-deadlines'
import { joinAsPlayer } from '@/domain/room/room-service'
import {
  openRound,
  registerBuzz,
  revealRound,
  startRoundClock
} from '@/domain/round/round-service'

import type { Connection } from './connection'
import { commitRoom, createRoomEngine, type RoomEngine } from './room-engine'
import { wakeRoom } from './round-conductor'

const OPENED_AT = 1_000_000
const COUNTDOWN_MS = 3_000
const ANSWER_WINDOW_MS = 10_000
const HOLD_MS = 5_000

const host: Connection = {
  playerId: null,
  role: 'host',
  send: () => {},
  sessionId: 'host-session'
}

/**
 * A room as a runtime that evicted it would find it again: the snapshot and
 * the sockets still attached, and no timer, closure or map from before.
 */
const restore = (snapshot: Room, { at }: { at: number }) => {
  const clock = { now: at }
  const wakes: (number | null)[] = []
  const engine: RoomEngine = createRoomEngine(structuredClone(snapshot), {
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
    /** Runs the room at the moment it asked to be woken, as an alarm would. */
    fire: () => {
      clock.now = wakes.at(-1) ?? clock.now
      wakeRoom(engine)
    },
    nextWake: () => wakes.at(-1) ?? null
  }
}

const buzzerRoomInCountdown = (): Room => {
  const room = newRoom({
    code: 'ABCD',
    game: 'buzzer',
    locale: 'fr',
    now: OPENED_AT
  })

  room.settings.countdownMs = COUNTDOWN_MS
  room.settings.autoAdvanceMs = HOLD_MS

  if (room.settings.mode.kind === 'buzzer') {
    room.settings.mode.answerWindowMs = ANSWER_WINDOW_MS
  }

  joinAsPlayer({
    newPlayerId: 'alice',
    nickname: 'Alice',
    now: OPENED_AT,
    room,
    sessionId: 'alice-session'
  })
  openRound({
    content: { kind: 'buzzer' },
    id: 'round-1',
    now: OPENED_AT,
    room
  })

  return room
}

describe('a room restored from a snapshot', () => {
  it('[deadline] lands its countdown when it was due, not a countdown later', () => {
    const snapshot = buzzerRoomInCountdown()
    const restored = restore(snapshot, { at: OPENED_AT + 1_000 })

    expect(restored.nextWake()).toBe(OPENED_AT + COUNTDOWN_MS)

    restored.fire()

    expect(restored.engine.room.phase).toBe('playing')
  })

  it('[deadline] runs out the floor on the window the buzz was given', () => {
    const snapshot = buzzerRoomInCountdown()
    const startedAt = OPENED_AT + COUNTDOWN_MS
    const buzzedAt = startedAt + 2_000

    startRoundClock({ now: startedAt, room: snapshot, roundId: 'round-1' })
    registerBuzz({
      now: buzzedAt,
      playerId: 'alice',
      room: snapshot,
      roundId: 'round-1'
    })

    const restored = restore(snapshot, { at: buzzedAt + 4_000 })

    expect(restored.nextWake()).toBe(buzzedAt + ANSWER_WINDOW_MS)

    restored.fire()

    expect(restored.engine.room.round?.activeBuzz).toBeNull()
    expect(restored.engine.room.round?.lockedOutPlayerIds.has('alice')).toBe(
      true
    )
  })

  it('[deadline] moves on from a reveal when its hold was due to end', () => {
    const snapshot = buzzerRoomInCountdown()
    const revealedAt = OPENED_AT + COUNTDOWN_MS + 1_000

    startRoundClock({
      now: OPENED_AT + COUNTDOWN_MS,
      room: snapshot,
      roundId: 'round-1'
    })
    revealRound(snapshot, revealedAt)

    const restored = restore(snapshot, { at: revealedAt + 1_000 })

    expect(restored.nextWake()).toBe(revealedAt + HOLD_MS)

    restored.fire()

    expect(restored.engine.room.phase).toBe('countdown')
    expect(restored.engine.room.round?.index).toBe(2)
  })

  it('[deadline] asks for nothing while the round is frozen for an absent host', () => {
    const snapshot = buzzerRoomInCountdown()
    const restored = restore(snapshot, { at: OPENED_AT })

    restored.engine.connections.all = () => []
    commitRoom(restored.engine)

    expect(restored.nextWake()).toBe(OPENED_AT + ABANDONED_ROOM_GRACE_MS)
  })
})
