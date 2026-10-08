import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { startRoomHarness } from './node-room-harness'
import {
  errorsIn,
  hostView,
  playerView,
  type RoomHarness,
  SEATED_CONSOLE_GAME,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const nicknamesOn = (view: { players: { nickname: string }[] } | null) =>
  view?.players.map((player) => player.nickname) ?? []

describe('a seat changing its name', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  it('[rename] reaches every screen in the room', async () => {
    const { code, host } = await harness.openRoom(SEATED_CONSOLE_GAME)
    const alice = await harness.seat({ code, nickname: 'Alice' })
    const bob = await harness.seat({ code, nickname: 'Bob' })

    alice.send({ nickname: 'Alicia', type: 'player.rename' })
    await waitFor(
      () => nicknamesOn(hostView(host)).includes('Alicia'),
      'the console to see the new name'
    )

    expect(nicknamesOn(playerView(bob))).toContain('Alicia')
    expect(nicknamesOn(playerView(bob))).not.toContain('Alice')
  })

  // The whole reason this is a frame rather than a second `hello`: reaching the
  // rename through the socket's own opening would drop the round it is holding.
  it('[rename] keeps the seat, the score and the socket', async () => {
    const { code, host } = await harness.openRoom(SEATED_CONSOLE_GAME)
    const alice = await harness.seat({ code, nickname: 'Alice' })
    const seatId = playerView(alice)?.youId

    alice.send({ nickname: 'Alicia', type: 'player.rename' })
    await waitFor(
      () => nicknamesOn(hostView(host)).includes('Alicia'),
      'the rename to land'
    )

    expect(playerView(alice)?.youId).toBe(seatId)
    expect(hostView(host)?.players.length).toBe(1)
  })

  /**
   * `player.rename` is named for the seat, not for the role — the same way
   * `player.leave` is. A console holding one is a player as far as its name is
   * concerned, and has no other way to fix a typo without giving the seat up.
   */
  it('[rename] renames a console that took a seat', async () => {
    const { host } = await harness.openRoom(SEATED_CONSOLE_GAME, 'Innkeeper')

    host.send({ nickname: 'The Innkeeper', type: 'player.rename' })
    await waitFor(
      () => nicknamesOn(hostView(host)).includes('The Innkeeper'),
      'the console to rename its own seat'
    )

    expect(errorsIn(host)).toEqual([])
  })

  it('[rename] refuses a socket holding no seat', async () => {
    const { code, host } = await harness.openRoom(SEATED_CONSOLE_GAME)

    await harness.seat({ code, nickname: 'Alice' })
    host.send({ nickname: 'Nobody', type: 'player.rename' })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(errorsIn(host)[0]?.code).toBe('invalid_message')
    expect(nicknamesOn(hostView(host))).toEqual(['Alice'])
  })

  // Non-fatal, so the socket stays open and the field can be corrected — the
  // same contract a refused join has.
  it('[rename] refuses a name another seat holds, without closing', async () => {
    const { code } = await harness.openRoom(SEATED_CONSOLE_GAME)
    const alice = await harness.seat({ code, nickname: 'Alice' })

    await harness.seat({ code, nickname: 'Bob' })
    alice.send({ nickname: 'bob', type: 'player.rename' })
    await waitFor(() => errorsIn(alice).length > 0, 'the refusal')

    expect(errorsIn(alice)[0]?.code).toBe('nickname_taken')
    expect(errorsIn(alice)[0]?.fatal).toBe(false)

    alice.send({ nickname: 'Alicia', type: 'player.rename' })
    await waitFor(
      () => nicknamesOn(playerView(alice)).includes('Alicia'),
      'the corrected name to land on the same socket'
    )
  })
})
