import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_BUZZER_SETTINGS } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'
import { hostServerMessageSchema } from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { startRoomHarness } from './node-room-harness'
import {
  CATALOGUE,
  errorsIn,
  FAST_GAME,
  hostView,
  type RoomHarness,
  SEATED_CONSOLE_GAME,
  sessionIdOf,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/** The bare buzzer: no content, and a round only its console can settle. */
const JUDGED_GAME: RoomSettings = {
  ...FAST_GAME,
  game: DEFAULT_BUZZER_SETTINGS
}

describe('a console that plays the room it runs', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  /**
   * A seated console cannot read the answer off its own view, so the round is
   * won the way a room wins it: by naming every track the catalogue holds until
   * one of them is the one playing. The three misses bank nothing — no two
   * entries share a title or an artist.
   */
  const winTheRound = async (
    host: Awaited<ReturnType<RoomHarness['openRoom']>>['host']
  ) => {
    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to start'
    )

    const roundId = hostView(host)?.round?.id ?? ''

    for (const track of CATALOGUE) {
      host.send({
        answer: { guess: `${track.title} ${track.artist}`, kind: 'typed' },
        roundId,
        type: 'player.answer'
      })
    }

    await waitFor(
      () => (hostView(host)?.players[0]?.score ?? 0) > 0,
      'the console to score on its own round'
    )
  }

  /**
   * The server's half of the reported fault. A tab discarded on a screen lock is
   * a *reload*, not a socket blink, so the console comes back saying whatever
   * storage tells it to say — and this is what it gets for saying the right
   * thing. That the browser now remembers what to say is the half no socket
   * suite can reach, and it is checked by driving the console.
   */
  it('[host-seat] brings a console that reloads back to the seat it was playing on', async () => {
    const { code, host } = await harness.openRoom(SEATED_CONSOLE_GAME, 'Marina')

    await winTheRound(host)

    const seatBefore = hostView(host)?.youId
    const scoreBefore = hostView(host)?.players[0]?.score ?? 0

    host.close()

    const reloaded = await harness.connect(code, hostServerMessageSchema)

    reloaded.send({
      nickname: 'Marina',
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(() => hostView(reloaded) !== null, 'the console to come back')

    expect(hostView(reloaded)?.youId).toBe(seatBefore)
    expect(hostView(reloaded)?.players[0]?.score).toBe(scoreBefore)
  })

  it('[host-seat] leaves a console unseated on a game it has to judge', async () => {
    const { host } = await harness.openRoom(JUDGED_GAME, 'Marina')

    expect(hostView(host)?.youId).toBeNull()
    expect(hostView(host)?.players).toEqual([])
  })

  /**
   * The picker sits on the lobby stage, where a console may already be seated —
   * so the seat outlives the reason it was allowed unless the frame that
   * changes the game is what takes it back.
   */
  it('[host-seat] takes the seat back when the room moves to a game its console must judge', async () => {
    const { host } = await harness.openRoom(SEATED_CONSOLE_GAME, 'Marina')

    expect(hostView(host)?.youId).not.toBeNull()

    host.send({ settings: JUDGED_GAME, type: 'host.updateSettings' })
    await waitFor(
      () => hostView(host)?.youId === null,
      'the console to give the seat up'
    )

    expect(hostView(host)?.players).toEqual([])
  })

  /**
   * The path that never touches a browser. A displaced console voids its
   * session id, so the one it mints on the way back matches nothing — and the
   * seat it left behind is still on the roster holding its name. The room comes
   * back and the seat does not, which is the whole of what has to be *said*.
   */
  it('[host-seat] refuses a console the seat its own ghost is still holding', async () => {
    const { code, host, hostToken } = await harness.openRoom(
      SEATED_CONSOLE_GAME,
      'Marina'
    )

    const takeover = await harness.connect(code, hostServerMessageSchema)

    takeover.send({
      hostToken,
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(() => hostView(takeover) !== null, 'the takeover to land')
    await waitFor(
      () => errorsIn(host).length > 0,
      'the displaced console to be told'
    )
    // The frame is fatal and the close is the client's, which is what leaves
    // the seat behind as a ghost nobody is connected to.
    host.close()

    const returning = await harness.connect(code, hostServerMessageSchema)

    returning.send({
      hostToken,
      nickname: 'Marina',
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(
      () => hostView(returning) !== null,
      'the room to come back to its owner'
    )

    expect(hostView(returning)?.youId).toBeNull()
    expect(errorsIn(returning).map((error) => error.code)).toContain(
      'nickname_taken'
    )
  })
})
