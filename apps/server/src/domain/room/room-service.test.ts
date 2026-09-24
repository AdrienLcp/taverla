import { beforeEach, describe, expect, it } from 'vitest'

import type { HostToken } from '@taverla/protocol/identifiers'
import { MAX_PLAYERS_PER_ROOM } from '@taverla/protocol/room'

import type { Room } from './room'
import {
  claimHost,
  HOST_RECLAIM_GRACE_MS,
  joinAsPlayer,
  markHostAway,
  removePlayer,
  renameSeat
} from './room-service'
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

  // The seat is the session's, not the socket's. This is what a player relies
  // on after a screen lock, and what makes StrictMode's double mount harmless.
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

  // `renameSeat` is the only way a name changes, so a screen that renamed
  // itself and then blinked off Wi-Fi comes back to the name it chose rather
  // than to the one still sitting in its memory.
  it('[room] keeps the name a returning seat already holds', () => {
    join('Alice', 'session-alice')
    join('Alicia', 'session-alice')

    expect([...room.players.values()].map((player) => player.nickname)).toEqual(
      ['Alice']
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

describe('renameSeat', () => {
  const seatOf = (nickname: string, sessionId: string) => {
    const joined = join(nickname, sessionId)

    if (joined.status !== 'success') {
      throw new Error('the join should have succeeded')
    }

    return joined.data
  }

  const rename = (participant: ReturnType<typeof seatOf>, nickname: string) =>
    renameSeat({ nickname, now: NOW, participant, room })

  it('[room] keeps the seat and the score across a rename', () => {
    const alice = seatOf('Alice', 'session-alice')

    alice.score = 7

    const renamed = rename(alice, 'Alicia')

    expect(renamed.status).toBe('success')
    expect(room.players.size).toBe(1)
    expect(room.players.get(alice.id)?.nickname).toBe('Alicia')
    expect(room.players.get(alice.id)?.score).toBe(7)
  })

  it('[room] refuses a nickname another player is using', () => {
    const alice = seatOf('Alice', 'session-alice')

    seatOf('Bob', 'session-bob')

    const clash = rename(alice, 'bob')

    expect(clash.status === 'failure' && clash.error).toBe('nickname_taken')
    expect(room.players.get(alice.id)?.nickname).toBe('Alice')
  })

  // A room full of seats is nothing a rename can make worse, and refusing one
  // there would strand the last player to arrive under a name they mistyped.
  it('[room] renames a seat in a room that is full', () => {
    const first = seatOf('Player 0', 'session-0')

    for (let index = 1; index < MAX_PLAYERS_PER_ROOM; index++) {
      seatOf(`Player ${index}`, `session-${index}`)
    }

    expect(rename(first, 'Alicia').status).toBe('success')
  })
})

describe('claimHost', () => {
  const A_STRANGERS_GUESS = 'ABCDABCD'

  const claim = ({
    at = NOW,
    hostToken = null,
    isHostConnected = false,
    sessionId
  }: {
    at?: number
    hostToken?: HostToken | null
    isHostConnected?: boolean
    sessionId: string
  }) => claimHost({ hostToken, isHostConnected, now: at, room, sessionId })

  it('[room] hands the room to the first host', () => {
    expect(claim({ sessionId: 'session-host' }).status).toBe('success')
    expect(room.hostSessionId).toBe('session-host')
  })

  it('[room] refuses a second screen while a host is connected', () => {
    claim({ sessionId: 'session-host' })

    const intruder = claim({
      isHostConnected: true,
      sessionId: 'session-other'
    })

    expect(intruder.status === 'failure' && intruder.error).toBe(
      'host_already_connected'
    )
    expect(room.hostSessionId).toBe('session-host')
  })

  it('[room] lets the same host reclaim the room after a reload', () => {
    claim({ sessionId: 'session-host' })

    expect(
      claim({ isHostConnected: true, sessionId: 'session-host' }).status
    ).toBe('success')
  })

  it('[room] holds the room for the console that has just dropped', () => {
    claim({ sessionId: 'session-host' })
    markHostAway(room, NOW)

    const early = claim({
      at: NOW + HOST_RECLAIM_GRACE_MS - 1,
      sessionId: 'session-replacement'
    })

    expect(early.status === 'failure' && early.error).toBe('host_reconnecting')
    expect(room.hostSessionId).toBe('session-host')
  })

  // The room keeps `hostSessionId` after the tab closes, so without this a host
  // whose laptop slept would be locked out of their own game forever.
  it('[room] lets a new screen take over once the grace window runs out', () => {
    claim({ sessionId: 'session-host' })
    markHostAway(room, NOW)

    expect(
      claim({
        at: NOW + HOST_RECLAIM_GRACE_MS,
        sessionId: 'session-replacement'
      }).status
    ).toBe('success')
    expect(room.hostSessionId).toBe('session-replacement')
    expect(room.hostLeftAt).toBeNull()
  })

  // The takeover was never the problem; it not being undoable was.
  it('[room] gives the room back to the screen holding the token', () => {
    claim({ sessionId: 'session-host' })
    markHostAway(room, NOW)
    claim({ at: NOW + HOST_RECLAIM_GRACE_MS, sessionId: 'session-replacement' })

    expect(
      claim({
        at: NOW + HOST_RECLAIM_GRACE_MS,
        hostToken: room.hostToken,
        isHostConnected: true,
        sessionId: 'session-host'
      }).status
    ).toBe('success')
    expect(room.hostSessionId).toBe('session-host')
  })

  it('[room] is no more open to a wrong token than to none', () => {
    claim({ sessionId: 'session-host' })

    const intruder = claim({
      hostToken: A_STRANGERS_GUESS,
      isHostConnected: true,
      sessionId: 'session-other'
    })

    expect(intruder.status === 'failure' && intruder.error).toBe(
      'host_already_connected'
    )
  })
})

describe('the two views', () => {
  beforeEach(() => {
    join('Alice', 'session-alice')
    room.trackPool = [
      {
        artist: 'Daft Punk',
        coverUrl: null,
        film: null,
        id: '3135556',
        title: 'Harder, Better, Faster, Stronger'
      }
    ]
  })

  it('[room] shows the host the pool, and no content before a round opens', () => {
    const view = toHostView({
      isHostConnected: true,
      isWallConnected: false,
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
