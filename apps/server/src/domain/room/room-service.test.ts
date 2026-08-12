import { beforeEach, describe, expect, it } from 'vitest'

import { MAX_PLAYERS_PER_ROOM } from '@taverla/protocol/room'

import type { Room } from './room'
import { claimHost, joinAsPlayer, removePlayer } from './room-service'
import { createRoom, deleteRoom } from './room-store'
import { toHostView, toPlayerView } from './room-view'

const NOW = 1_786_215_000_000

let room: Room

const join = (nickname: string, sessionId: string) =>
  joinAsPlayer({ nickname, now: NOW, room, sessionId })

beforeEach(() => {
  const created = createRoom({ game: 'blindtest', locale: 'fr', now: NOW })

  if (created === null) {
    throw new Error('the store refused to allocate a room')
  }

  room = created
})

describe('joinAsPlayer', () => {
  it('[room] seats a newcomer with no score', () => {
    const joined = join('Alice', 'session-alice')

    expect(joined.status).toBe('success')
    expect(joined.status === 'success' && joined.data.score).toBe(0)
    expect(room.players.size).toBe(1)
  })

  // The seat is the session's, not the socket's. This is what a phone relies on
  // after a screen lock, and what makes StrictMode's double mount harmless.
  it('[room] returns the same seat and score to a returning session', () => {
    const first = join('Alice', 'session-alice')

    if (first.status !== 'success') {
      throw new Error('the first join should have succeeded')
    }

    first.data.score = 7

    const second = join('Alice', 'session-alice')

    expect(second.status === 'success' && second.data.id).toBe(first.data.id)
    expect(second.status === 'success' && second.data.score).toBe(7)
    expect(room.players.size).toBe(1)
  })

  it('[room] lets a returning session change its nickname', () => {
    join('Alice', 'session-alice')
    join('Alicia', 'session-alice')

    expect([...room.players.values()].map((player) => player.nickname)).toEqual(
      ['Alicia']
    )
  })

  it('[room] refuses a nickname another player is using', () => {
    join('Alice', 'session-alice')

    const clash = join('alice', 'session-bob')

    expect(clash.status === 'failure' && clash.error).toBe('nickname_taken')
  })

  it('[room] refuses a newcomer once the room is full', () => {
    for (let index = 0; index < MAX_PLAYERS_PER_ROOM; index++) {
      join(`Player ${index}`, `session-${index}`)
    }

    const overflow = join('Latecomer', 'session-late')

    expect(overflow.status === 'failure' && overflow.error).toBe('room_full')
  })
})

describe('claimHost', () => {
  const claim = (sessionId: string, isHostConnected: boolean) =>
    claimHost({ isHostConnected, now: NOW, room, sessionId })

  it('[room] hands the room to the first host', () => {
    expect(claim('session-host', false).status).toBe('success')
    expect(room.hostSessionId).toBe('session-host')
  })

  it('[room] refuses a second screen while a host is connected', () => {
    claim('session-host', false)

    const intruder = claim('session-other', true)

    expect(intruder.status === 'failure' && intruder.error).toBe(
      'host_already_connected'
    )
    expect(room.hostSessionId).toBe('session-host')
  })

  it('[room] lets the same host reclaim the room after a reload', () => {
    claim('session-host', false)

    expect(claim('session-host', true).status).toBe('success')
  })

  // The room keeps `hostSessionId` after the tab closes, so without this a host
  // whose laptop slept would be locked out of their own game forever.
  it('[room] lets a new screen take over once no host is connected', () => {
    claim('session-host', false)

    expect(claim('session-replacement', false).status).toBe('success')
    expect(room.hostSessionId).toBe('session-replacement')
  })
})

describe('the two views', () => {
  beforeEach(() => {
    join('Alice', 'session-alice')
    room.trackPool = [
      {
        artist: 'Daft Punk',
        coverUrl: null,
        id: '3135556',
        title: 'Harder, Better, Faster, Stronger'
      }
    ]
  })

  it('[room] shows the host the pool, and no content before a round opens', () => {
    const view = toHostView({
      isHostConnected: true,
      room,
      seatId: null
    })

    expect(view.remainingPoolSize).toBe(1)
    expect(view.currentContent).toBeNull()
  })

  // The projection is the seam the whole anti-cheat guarantee rests on: a player
  // view is built from a room that holds the answer, and must not carry it.
  it('[anti-cheat] never puts the pool or the track in a player view', () => {
    const player = [...room.players.values()][0]

    if (player === undefined) {
      throw new Error('the fixture should have seated a player')
    }

    const serialised = JSON.stringify(
      toPlayerView({ isHostConnected: true, room, youId: player.id })
    )

    expect(serialised).not.toContain('Daft Punk')
    expect(serialised).not.toContain('cdnt-preview')
    expect(serialised).not.toContain('remainingPoolSize')
    expect(JSON.parse(serialised).youId).toBe(player.id)
  })

  it('[room] tells each player which seat is theirs', () => {
    join('Bob', 'session-bob')

    const [alice, bob] = [...room.players.values()]

    expect(
      toPlayerView({ isHostConnected: true, room, youId: alice?.id ?? '' })
        .youId
    ).not.toBe(
      toPlayerView({ isHostConnected: true, room, youId: bob?.id ?? '' }).youId
    )
  })
})

describe('removePlayer', () => {
  it('[room] frees the seat and the nickname', () => {
    const joined = join('Alice', 'session-alice')

    if (joined.status !== 'success') {
      throw new Error('the join should have succeeded')
    }

    removePlayer(room, joined.data.id, NOW)

    expect(room.players.size).toBe(0)
    expect(join('Alice', 'session-carol').status).toBe('success')
  })
})

describe('createRoom', () => {
  it('[room] issues codes the wire schema accepts, and never reuses a live one', () => {
    const codes = Array.from({ length: 50 }, () => {
      const created = createRoom({ game: 'blindtest', locale: 'fr', now: NOW })

      if (created === null) {
        throw new Error('the store refused to allocate a room')
      }

      return created.code
    })

    expect(new Set(codes).size).toBe(codes.length)

    for (const code of codes) {
      deleteRoom(code)
    }
  })
})
