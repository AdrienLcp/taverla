import { describe, expect, it } from 'vitest'

import {
  forgetSeat,
  hostTokenFor,
  hostTokensWithout,
  MAX_REMEMBERED_SEATS,
  type RememberedHostToken,
  type RememberedSeat,
  refusalVoidsSeat,
  rememberedSeatFor,
  rememberHostToken,
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

    expect(
      rememberedSeatFor({ role: 'host', roomCode: 'ABCD', seats })?.sessionId
    ).toBe('the-console')
    expect(
      rememberedSeatFor({ role: 'player', roomCode: 'ABCD', seats })?.sessionId
    ).toBe('the-phone')
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

describe('refusalVoidsSeat', () => {
  it('[session-memory] gives up a claim the door turned away', () => {
    expect(refusalVoidsSeat('host_already_connected')).toBe(true)
    expect(refusalVoidsSeat('room_not_found')).toBe(true)
  })

  it('[session-memory] keeps a seat a client could not describe itself into', () => {
    expect(refusalVoidsSeat('protocol_version_mismatch')).toBe(false)
    expect(refusalVoidsSeat('invalid_message')).toBe(false)
  })

  it('[session-memory] keeps a seat that was granted before the room ended', () => {
    expect(refusalVoidsSeat('room_closed')).toBe(false)
  })

  it('[session-memory] gives up a seat the host took back, since the room answers still', () => {
    expect(refusalVoidsSeat('removed_by_host')).toBe(true)
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

describe('rememberHostToken', () => {
  const tokenIn = (roomCode: string, at: number): RememberedHostToken => ({
    at,
    hostToken: `TOKEN-${roomCode}`,
    roomCode
  })

  it('[session-memory] hands back the token kept for one room', () => {
    const tokens = [tokenIn('ABCD', NOW), tokenIn('BCDE', NOW)]

    expect(hostTokenFor({ roomCode: 'BCDE', tokens })).toBe('TOKEN-BCDE')
    expect(hostTokenFor({ roomCode: 'CDEF', tokens })).toBeNull()
  })

  it('[session-memory] keeps one token per room when a room is re-entered', () => {
    const tokens = rememberHostToken({
      at: NOW + 1,
      hostToken: 'TAKEN-BY-HAND',
      roomCode: 'ABCD',
      tokens: [tokenIn('ABCD', NOW)]
    })

    expect(tokens).toEqual([
      { at: NOW + 1, hostToken: 'TAKEN-BY-HAND', roomCode: 'ABCD' }
    ])
  })

  it('[session-memory] forgets a token kept more than a day ago', () => {
    const tokens = rememberHostToken({
      at: NOW,
      hostToken: 'TOKEN-ABCD',
      roomCode: 'ABCD',
      tokens: [tokenIn('BCDE', NOW - SEAT_MEMORY_MS)]
    })

    expect(tokens.map((kept) => kept.roomCode)).toEqual(['ABCD'])
  })

  it('[session-memory] drops the room a disbanded code no longer opens', () => {
    expect(
      hostTokensWithout({
        roomCode: 'ABCD',
        tokens: [tokenIn('ABCD', NOW), tokenIn('BCDE', NOW)]
      })
    ).toEqual([tokenIn('BCDE', NOW)])
  })
})
