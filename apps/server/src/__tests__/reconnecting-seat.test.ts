import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  playerView,
  type RoomHarness,
  sessionIdOf,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

describe('a seat whose socket was replaced', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  /**
   * An app switch or a Wi-Fi handover leaves the old socket half-open, so the
   * server welcomes the replacement first and only hears the original die
   * afterwards.
   */
  const reconnect = async (code: string) => {
    const zombie = await harness.seat({ code, nickname: 'Zoe' })
    const returned = await harness.seat({
      code,
      nickname: 'Zoe',
      sessionId: sessionIdOf(zombie)
    })

    return { returned, zombie }
  }

  /**
   * A frame the room sends for its own reasons, so an assertion after it reads
   * a view drawn later than the dead socket rather than the one already on
   * screen — nothing is broadcast when the close changes nothing.
   */
  const seatAWitness = async (code: string) => {
    await harness.seat({ code, nickname: 'Ada' })
  }

  it('[reconnect] keeps the name on the roster when the socket it replaced dies', async () => {
    const { code } = await harness.openRoom()
    const { returned, zombie } = await reconnect(code)

    zombie.close()
    await zombie.whenClosed
    await seatAWitness(code)
    await waitFor(
      () =>
        playerView(returned)?.players.some(
          (player) => player.nickname === 'Ada'
        ) === true,
      'a view drawn after the dead socket'
    )

    const zoe = playerView(returned)?.players.find(
      (player) => player.nickname === 'Zoe'
    )

    expect(zoe?.isConnected).toBe(true)
  })

  it('[reconnect] leaves the floor with the player who took it', async () => {
    const { code, host } = await harness.openRoom()
    const { returned, zombie } = await reconnect(code)

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(returned)?.phase === 'playing',
      'the clip to start'
    )

    returned.send({
      roundId: playerView(returned)?.round?.id ?? '',
      type: 'player.buzz'
    })
    await waitFor(
      () => playerView(returned)?.round?.activeBuzz != null,
      'the floor to be taken'
    )

    zombie.close()
    await zombie.whenClosed
    await seatAWitness(code)
    await waitFor(
      () =>
        playerView(returned)?.players.some(
          (player) => player.nickname === 'Ada'
        ) === true,
      'a view drawn after the dead socket'
    )

    expect(playerView(returned)?.round?.activeBuzz).not.toBeNull()
  })
})
