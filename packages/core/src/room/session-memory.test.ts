import { describe, expect, it } from 'vitest'

import {
  forgetSeat,
  MAX_REMEMBERED_SEATS,
  type RememberedSeat,
  rememberedSeatFor,
  rememberSeat,
  SEAT_MEMORY_MS
} from './session-memory'

const NOW = 1_700_000_000_000

const ROOM_CODES = [
  'ABCD',
  'BCDE',
  'CDEF',
  'DEFG',
  'EFGH',
  'FGHJ',
  'GHJK',
  'HJKL',
  'JKLM'
]

const seatIn = (roomCode: string, at: number): RememberedSeat => ({
  at,
  role: 'player',
  roomCode,
  sessionId: `session-${roomCode}`
})

const aFullStore = (): RememberedSeat[] =>
  ROOM_CODES.slice(0, MAX_REMEMBERED_SEATS).map((roomCode, index) =>
    seatIn(roomCode, NOW - index)
  )

const oneRoomTooMany = ROOM_CODES[MAX_REMEMBERED_SEATS] ?? ''
const leastRecent = ROOM_CODES[MAX_REMEMBERED_SEATS - 1] ?? ''

describe('rememberedSeatFor', () => {
  it('[session-memory] tells the two roles in one room apart', () => {
    const seats: RememberedSeat[] = [
      { at: NOW, role: 'host', roomCode: 'ABCD', sessionId: 'the-console' },
      { at: NOW, role: 'player', roomCode: 'ABCD', sessionId: 'the-phone' }
    ]

    expect(rememberedSeatFor({ role: 'host', roomCode: 'ABCD', seats })).toBe(
      'the-console'
    )
    expect(rememberedSeatFor({ role: 'player', roomCode: 'ABCD', seats })).toBe(
      'the-phone'
    )
  })

  it('[session-memory] holds no claim on a room this device has not played', () => {
    expect(
      rememberedSeatFor({
        role: 'player',
        roomCode: 'BCDE',
        seats: [seatIn('ABCD', NOW)]
      })
    ).toBeNull()
  })
})

describe('rememberSeat', () => {
  it('[session-memory] keeps one entry per seat when a room is re-entered', () => {
    const seats = rememberSeat({
      at: NOW + 1,
      role: 'player',
      roomCode: 'ABCD',
      seats: [seatIn('ABCD', NOW)],
      sessionId: 'session-ABCD'
    })

    expect(seats).toEqual([seatIn('ABCD', NOW + 1)])
  })

  it('[session-memory] drops the least recently claimed seat past the cap', () => {
    const seats = rememberSeat({
      at: NOW + 1,
      role: 'player',
      roomCode: oneRoomTooMany,
      seats: aFullStore(),
      sessionId: `session-${oneRoomTooMany}`
    })

    expect(seats).toHaveLength(MAX_REMEMBERED_SEATS)
    expect(seats[0]?.roomCode).toBe(oneRoomTooMany)
    expect(seats.map((seat) => seat.roomCode)).not.toContain(leastRecent)
  })

  it('[session-memory] forgets a seat claimed more than a day ago', () => {
    const seats = rememberSeat({
      at: NOW,
      role: 'player',
      roomCode: 'ABCD',
      seats: [seatIn('BCDE', NOW - SEAT_MEMORY_MS)],
      sessionId: 'session-ABCD'
    })

    expect(seats).toEqual([seatIn('ABCD', NOW)])
  })

  // The claim being made is the one a prune may never drop, and a device whose
  // clock stepped backwards is where that stops being automatic.
  it('[session-memory] keeps the seat being claimed under a backwards clock', () => {
    const seats = rememberSeat({
      at: NOW,
      role: 'player',
      roomCode: oneRoomTooMany,
      seats: aFullStore().map((seat) => ({ ...seat, at: NOW + 10_000 })),
      sessionId: `session-${oneRoomTooMany}`
    })

    expect(seats).toHaveLength(MAX_REMEMBERED_SEATS)
    expect(seats[0]).toEqual(seatIn(oneRoomTooMany, NOW))
  })
})

describe('forgetSeat', () => {
  it('[session-memory] gives up one seat and leaves the rest standing', () => {
    const seats = forgetSeat({
      role: 'player',
      roomCode: 'ABCD',
      seats: [
        seatIn('ABCD', NOW),
        { at: NOW, role: 'host', roomCode: 'ABCD', sessionId: 'the-console' },
        seatIn('BCDE', NOW)
      ]
    })

    expect(seats.map((seat) => seat.sessionId)).toEqual([
      'the-console',
      'session-BCDE'
    ])
  })
})
