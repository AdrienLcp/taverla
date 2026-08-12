import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_MODE_SETTINGS } from '@taverla/protocol/room'
import {
  hostServerMessageSchema,
  type PlayerServerMessage,
  playerServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { roomSettingsFor } from '@taverla/core/room/room-settings'
import {
  type ClockSample,
  estimateClockOffset,
  millisecondsUntil
} from '@taverla/core/time/clock-sync'

import {
  errorsIn,
  FAST_GAME,
  halves,
  hostView,
  type Peer,
  playerView,
  type RoomHarness,
  sleep,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const WON_IT = halves(true, true)

/** Long enough to read a view while the countdown is still on screen. */
const SLOW_COUNTDOWN = { ...FAST_GAME, countdownMs: 600 }

/** A phone left on the wrong time zone offset, four seconds ahead of the server. */
const DEVICE_SKEW_MS = 4_000
const deviceNow = () => Date.now() + DEVICE_SKEW_MS

let room: RoomHarness

beforeEach(async () => {
  room = await startRoomHarness()
})

afterEach(async () => {
  await room.stop()
})

describe('the rules every socket obeys', () => {
  it('[protocol] refuses a host action arriving on a player socket', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })

    alice.send({ type: 'host.startRound' })
    await waitFor(() => errorsIn(alice).length > 0, 'the refusal')

    expect(errorsIn(alice)[0]).toMatchObject({
      code: 'host_only_action',
      fatal: false
    })
    expect(hostView(host)?.phase).toBe('lobby')
  })

  it('[protocol] hangs up on a socket whose first frame is not a hello', async () => {
    const { code } = await room.openRoom()
    const impatient = await room.connect(code, playerServerMessageSchema)

    impatient.send({ roundId: 'whatever', type: 'player.buzz' })

    expect(await impatient.whenClosed).toBe(1008)
    expect(errorsIn(impatient)[0]).toMatchObject({
      code: 'invalid_message',
      fatal: true
    })
  })

  // The seam the client's `refused` status hangs on: fatal, so it stops
  // retrying, and closed, so it cannot sit there looking connected.
  it('[protocol] hangs up on a host pointed at a room that does not exist', async () => {
    const lost = await room.connect('K3M9', hostServerMessageSchema)

    lost.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })

    expect(await lost.whenClosed).toBe(1008)
    expect(errorsIn(lost)[0]).toMatchObject({
      code: 'room_not_found',
      fatal: true
    })
  })

  it('[seat] gives a reloading player back the same seat and score', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({
      code,
      nickname: 'Alice',
      sessionId: 'alice-session'
    })

    const aliceId = playerView(alice)?.youId ?? ''

    host.send({ type: 'host.startRound' })
    await waitFor(() => hostView(host)?.phase === 'playing', 'the clip')

    const roundId = hostView(host)?.round?.id ?? ''

    alice.send({ roundId, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    host.send({
      playerId: aliceId,
      roundId,
      type: 'host.judge',
      verdict: WON_IT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    alice.close()
    await sleep(30)

    const reloaded = await room.seat({
      code,
      nickname: 'Alice',
      sessionId: 'alice-session'
    })

    expect(playerView(reloaded)?.youId).toBe(aliceId)
    expect(playerView(reloaded)?.players).toEqual([
      { id: aliceId, isConnected: true, nickname: 'Alice', score: 2 }
    ])
  })

  // The room is opened before the table decides, so a lobby with no game is an
  // ordinary state. The console greys the launch out; this is the rule under
  // it, and the code is its own because the phase is right and the decision is
  // what is missing.
  it('[settings] refuses to open a round in a room with no game', async () => {
    const { code, host } = await room.openRoom(
      roomSettingsFor({ game: null, locale: 'fr' })
    )

    await room.seat({ code, nickname: 'Alice' })
    host.send({ type: 'host.startRound' })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(errorsIn(host)[0]).toMatchObject({
      code: 'no_game_chosen',
      fatal: false
    })
    expect(hostView(host)?.phase).toBe('lobby')
  })

  it('[settings] opens the round once the table has picked one', async () => {
    const { code, host } = await room.openRoom(
      roomSettingsFor({ game: null, locale: 'fr' })
    )

    await room.seat({ code, nickname: 'Alice' })
    host.send({ settings: FAST_GAME, type: 'host.updateSettings' })
    await waitFor(
      () => hostView(host)?.settings.game?.kind === 'blindtest',
      'the game'
    )

    host.send({ type: 'host.startRound' })
    await waitFor(() => hostView(host)?.phase === 'playing', 'the clip')

    expect(errorsIn(host)).toEqual([])
  })

  it('[settings] takes a countdown the host moves mid-round, for the next one', async () => {
    const { code, host } = await room.openRoom()

    await room.seat({ code, nickname: 'Alice' })
    host.send({ type: 'host.startRound' })
    await waitFor(() => hostView(host)?.phase === 'playing', 'the clip')

    host.send({
      settings: { ...FAST_GAME, countdownMs: 1_200 },
      type: 'host.updateSettings'
    })
    await waitFor(
      () => hostView(host)?.settings.countdownMs === 1_200,
      'the new countdown'
    )

    expect(errorsIn(host)).toEqual([])
  })

  // The console greys the control out, which is a courtesy rather than a rule:
  // the round is scored on the way out from whatever mode it closes on, so a
  // frame that swapped it would pay a typed answer at a pick's rate.
  it('[settings] refuses the mode the round in play is scored by', async () => {
    const { code, host } = await room.openRoom()

    await room.seat({ code, nickname: 'Alice' })
    host.send({ type: 'host.startRound' })
    await waitFor(() => hostView(host)?.phase === 'playing', 'the clip')

    host.send({
      settings: { ...FAST_GAME, mode: DEFAULT_MODE_SETTINGS.choice },
      type: 'host.updateSettings'
    })
    await waitFor(() => errorsIn(host).length > 0, 'the refusal')

    expect(errorsIn(host)[0]).toMatchObject({
      code: 'wrong_phase',
      fatal: false
    })
    expect(hostView(host)?.settings.mode.kind).toBe('buzzer')
  })

  it('[settings] takes the same change once the round is over', async () => {
    const { code, host } = await room.openRoom()

    await room.seat({ code, nickname: 'Alice' })
    host.send({ type: 'host.startRound' })
    await waitFor(() => hostView(host)?.phase === 'playing', 'the clip')

    const roundId = hostView(host)?.round?.id ?? ''

    host.send({ roundId, type: 'host.reveal' })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    host.send({
      settings: { ...FAST_GAME, mode: DEFAULT_MODE_SETTINGS.choice },
      type: 'host.updateSettings'
    })
    await waitFor(
      () => hostView(host)?.settings.mode.kind === 'choice',
      'the new mode'
    )

    expect(errorsIn(host)).toEqual([])
  })

  // `estimateClockOffset` is unit-tested against invented samples; this is the
  // handshake that produces them, over a real socket, on a device that is four
  // seconds out. Without the correction the phone starts the clip early — the
  // last assertion is what that failure looks like.
  it('[clock] lands the countdown on a device four seconds ahead of the server', async () => {
    const { code, host } = await room.openRoom(SLOW_COUNTDOWN)
    const alice = await room.seat({ code, nickname: 'Alice' })

    for (let ping = 0; ping < 3; ping++) {
      alice.send({ clientSentAt: deviceNow(), type: 'time.ping' })
      await sleep(20)
    }

    await waitFor(() => pongSamples(alice).length === 3, 'the pongs')

    const estimate = estimateClockOffset(pongSamples(alice))

    expect(estimate?.offsetMs).toBeCloseTo(-DEVICE_SKEW_MS, -2)

    host.send({ type: 'host.startRound' })
    await waitFor(
      () => playerView(alice)?.phase === 'countdown',
      'the countdown'
    )

    const startsAt = playerView(alice)?.round?.startsAt ?? 0
    const trulyRemainingMs = startsAt - Date.now()

    expect(trulyRemainingMs).toBeGreaterThan(100)
    expect(millisecondsUntil(estimate, startsAt, deviceNow())).toBeCloseTo(
      trulyRemainingMs,
      -2
    )
    expect(millisecondsUntil(null, startsAt, deviceNow())).toBe(0)
  })
})

const pongSamples = (peer: Peer<PlayerServerMessage>): ClockSample[] =>
  peer.frames.flatMap(({ message, receivedAt }) =>
    message.type === 'time.pong'
      ? [
          {
            clientReceivedAt: receivedAt + DEVICE_SKEW_MS,
            clientSentAt: message.clientSentAt,
            serverTime: message.serverTime
          }
        ]
      : []
  )
