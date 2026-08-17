import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerServerMessage } from '@taverla/protocol/server-message'

import {
  errorsIn,
  hostContent,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  SEATED_CONSOLE_GAME,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const roomFramesIn = (player: Peer<PlayerServerMessage>) =>
  player.frames.filter(({ message }) => message.type === 'room.updated')

describe('a player the host removes', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  it('[eviction] is told so, fatally, and nobody else is', async () => {
    const { code, host } = await harness.openRoom()
    const zoe = await harness.seat({ code, nickname: 'Zoe' })
    const ada = await harness.seat({ code, nickname: 'Ada' })

    host.send({
      playerId: playerView(zoe)?.youId ?? '',
      type: 'host.removePlayer'
    })
    await waitFor(() => errorsIn(zoe).length > 0, 'Zoe to hear about it')

    expect(errorsIn(zoe)).toEqual([
      expect.objectContaining({ code: 'removed_by_host', fatal: true })
    ])
    expect(errorsIn(ada)).toEqual([])
  })

  it('[eviction] stops being sent the room it is out of', async () => {
    const { code, host } = await harness.openRoom()
    const zoe = await harness.seat({ code, nickname: 'Zoe' })
    const ada = await harness.seat({ code, nickname: 'Ada' })

    host.send({
      playerId: playerView(zoe)?.youId ?? '',
      type: 'host.removePlayer'
    })
    await waitFor(() => errorsIn(zoe).length > 0, 'Zoe to hear about it')

    const framesWhenTold = roomFramesIn(zoe).length

    // A view the room draws for its own reasons, well after the refusal: the
    // socket is still open here, so the only thing keeping it quiet is the
    // eviction having unregistered it.
    await harness.seat({ code, nickname: 'Max' })
    await waitFor(
      () =>
        playerView(ada)?.players.some((player) => player.nickname === 'Max') ===
        true,
      'the room to be drawn again'
    )

    expect(roomFramesIn(zoe)).toHaveLength(framesWhenTold)
  })

  it('[eviction] leaves the floor to the players still in the room', async () => {
    const { code, host } = await harness.openRoom()
    const zoe = await harness.seat({ code, nickname: 'Zoe' })
    const ada = await harness.seat({ code, nickname: 'Ada' })

    host.send({ type: 'host.startRound' })
    await waitFor(() => playerView(ada)?.phase === 'playing', 'the clip')

    zoe.send({
      roundId: playerView(zoe)?.round?.id ?? '',
      type: 'player.buzz'
    })
    await waitFor(
      () => playerView(ada)?.round?.activeBuzz != null,
      'Zoe to take the floor'
    )

    host.send({
      playerId: playerView(zoe)?.youId ?? '',
      type: 'host.removePlayer'
    })
    await waitFor(
      () => playerView(ada)?.round?.activeBuzz == null,
      'the floor to come back'
    )

    expect(
      playerView(ada)?.players.some((player) => player.nickname === 'Zoe')
    ).toBe(false)
  })

  /**
   * The ✕ in the lobby roster sits beside the console's own seat, and
   * `answer-modes.test.ts` covers the exit that screen *chooses*. This is the
   * one it does not: eviction never took the seat off the host connection, so
   * `toHostView` went on reading a player the roster no longer held — and a
   * judge naming a departed id is served the round with the answer withheld.
   */
  it('[eviction] gives a console back the answer when it removes its own seat', async () => {
    const { code, host } = await harness.openRoom(SEATED_CONSOLE_GAME, 'Adrien')
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.send({
      playerId: hostView(host)?.youId ?? '',
      type: 'host.removePlayer'
    })
    await waitFor(
      () => playerView(zoe)?.players.length === 1,
      'the console to leave the roster'
    )

    expect(hostView(host)?.youId).toBeNull()

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to start'
    )

    expect(hostContent(host)?.track).not.toBeNull()
  })
})
