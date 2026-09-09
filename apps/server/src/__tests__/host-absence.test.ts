import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_BLINDTEST_SETTINGS } from '@taverla/protocol/game'
import type { RoomSettings } from '@taverla/protocol/room'
import {
  hostServerMessageSchema,
  playerServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  errorsIn,
  FAST_GAME,
  hostContent,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  SEATED_CONSOLE_GAME,
  sessionIdOf,
  sleep,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

/** Long enough that a frozen clip and a running one are unmistakably different. */
const LONG_CLIP: RoomSettings = {
  ...FAST_GAME,
  game: { ...DEFAULT_BLINDTEST_SETTINGS, roundDurationMs: 30_000 }
}

/** The long clip again, in the one mode a console is allowed a seat in. */
const LONG_CLIP_THE_CONSOLE_PLAYS: RoomSettings = {
  ...LONG_CLIP,
  mode: SEATED_CONSOLE_GAME.mode
}

const AWAY_FOR_MS = 400

/** Long enough that losing it would be unmistakable in the elapsed time. */
const PLAYED_FOR_MS = 300

describe('a host who walks away', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const playingRoom = async () => {
    const { code, host } = await harness.openRoom(LONG_CLIP)
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'playing',
      'the clip to start'
    )

    return { code, host, player }
  }

  it('[host-absence] tells the room, and takes the buzzer away', async () => {
    const { host, player } = await playingRoom()

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    expect(playerView(player)?.phase).toBe('playing')
  })

  /**
   * A console that took a seat is two things at once, and the tab closing ends
   * both. The seat used to survive it for good: nothing ever marked it away, so
   * the name stayed lit on every screen and the sweeper — which reads the stamp
   * that was never written — never came for it either.
   */
  it('[host-absence] gives up the seat the console was playing on', async () => {
    const { code, host } = await harness.openRoom(
      LONG_CLIP_THE_CONSOLE_PLAYS,
      'Marina'
    )
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    const marina = playerView(player)?.players.find(
      (seated) => seated.nickname === 'Marina'
    )

    expect(marina?.isConnected).toBe(false)
  })

  it('[host-absence] banks the clip where it stopped and spends none of the absence', async () => {
    const { code, host, player } = await playingRoom()

    await sleep(PLAYED_FOR_MS)

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => hostView(returned)?.isHostConnected === true,
      'the host to reclaim the room'
    )

    const elapsed = hostView(returned)?.roundElapsedMs ?? 0

    // Both halves are load-bearing. The floor proves the seconds the room had
    // already heard were banked rather than thrown away by the resume — drop
    // the freeze and the resume silently restarts the clip from zero. The
    // ceiling proves the absence itself cost the round nothing.
    expect(elapsed).toBeGreaterThanOrEqual(PLAYED_FOR_MS * 0.8)
    expect(elapsed).toBeLessThan(PLAYED_FOR_MS + AWAY_FOR_MS / 2)
  })

  it('[host-absence] gives the countdown back rather than resuming it late', async () => {
    const { code, host } = await harness.openRoom({
      ...LONG_CLIP,
      countdownMs: 400
    })
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'countdown',
      'the countdown to open'
    )

    const firstStart = playerView(player)?.round?.startsAt ?? 0

    host.close()
    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => (hostView(returned)?.round?.startsAt ?? 0) > firstStart,
      'the countdown to be given back'
    )

    expect(hostView(returned)?.phase).toBe('countdown')
  })

  /**
   * The freeze used to be the client's alone. Every timer stopped, and the floor
   * could still answer its way to the end of a round no console was there to
   * hear — which closed it, revealed it, and armed the next clip for nobody.
   */
  it('[host-absence] refuses the floor rather than letting it finish the round alone', async () => {
    const { code, host } = await harness.openRoom(LONG_CLIP_THE_CONSOLE_PLAYS)
    const player = await harness.seat({ code, nickname: 'Zoe' })

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(player)?.phase === 'playing',
      'the clip to start'
    )

    // Read while a console is still there to be sent it: the whole answer, so
    // an accepted frame would bank both halves and end the round on its own.
    const track = hostContent(host)?.track
    const roundId = playerView(player)?.round?.id ?? ''

    host.close()
    await waitFor(
      () => playerView(player)?.isHostConnected === false,
      'the room to hear the host leave'
    )

    player.send({
      answer: { guess: `${track?.title} ${track?.artist}`, kind: 'typed' },
      roundId,
      type: 'player.answer'
    })
    await waitFor(() => errorsIn(player).length === 1, 'the refusal')

    expect(errorsIn(player).at(0)?.code).toBe('host_away')
    expect(playerView(player)?.phase).toBe('playing')
  })

  it('[host-absence] hands the room back to a player who is still there', async () => {
    const { code, host } = await playingRoom()
    const watcher: Peer<unknown> = await harness.connect(
      code,
      playerServerMessageSchema
    )

    host.close()
    await sleep(AWAY_FOR_MS)

    const returned = await harness.connect(code, hostServerMessageSchema)

    returned.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => hostView(returned)?.phase === 'playing',
      'the round to still be there'
    )

    watcher.close()
  })
})
