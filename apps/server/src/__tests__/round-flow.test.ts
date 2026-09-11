import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hostServerMessageSchema,
  type PlayerServerMessage
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import {
  blindtestRound,
  errorsIn,
  FAST_GAME,
  halves,
  hostContent,
  hostView,
  type Peer,
  PREVIEW_HOST,
  playerView,
  type RoomHarness,
  sessionIdOf,
  sleep,
  startRoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const WON_IT = halves(true, true)
const MISSED_IT = halves(false, false)

let room: RoomHarness

beforeEach(async () => {
  room = await startRoomHarness()
})

afterEach(async () => {
  await room.stop()
})

const runRoundToPlaying = async (
  host: Awaited<ReturnType<RoomHarness['openRoom']>>['host'],
  begin: 'host.startRound' | 'host.nextRound'
) => {
  host.send({ type: begin })
  await waitFor(() => hostView(host)?.phase === 'playing', 'the clip to start')

  const round = hostView(host)?.round

  if (round == null) {
    throw new Error('The round vanished as playback started')
  }

  return round
}

describe('a whole game over real sockets', () => {
  it('[round] plays three rounds from the lobby to the final scores', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })
    const bob = await room.seat({ code, nickname: 'Bob' })

    const aliceId = playerView(alice)?.youId ?? ''
    const bobId = playerView(bob)?.youId ?? ''

    const script: [Peer<PlayerServerMessage>, string][] = [
      [alice, aliceId],
      [bob, bobId],
      [alice, aliceId]
    ]

    for (const [index, [buzzer, buzzerId]] of script.entries()) {
      const round = await runRoundToPlaying(
        host,
        index === 0 ? 'host.startRound' : 'host.nextRound'
      )

      expect(round.index).toBe(index + 1)

      buzzer.send({ roundId: round.id, type: 'player.buzz' })
      await waitFor(
        () => hostView(host)?.phase === 'buzzed',
        'the buzz to register'
      )

      host.send({
        playerId: buzzerId,
        roundId: round.id,
        type: 'host.judge',
        verdict: WON_IT
      })
      await waitFor(
        () => hostView(host)?.phase === 'revealed',
        'the reveal to land'
      )

      expect(blindtestRound(hostView(host))?.revealedTrack?.title).toBeTypeOf(
        'string'
      )
    }

    host.send({ type: 'host.nextRound' })
    await waitFor(() => hostView(host)?.phase === 'finished', 'the game to end')

    const scores = Object.fromEntries(
      (hostView(host)?.players ?? []).map((player) => [
        player.nickname,
        player.score
      ])
    )

    expect(scores).toEqual({ Alice: 4, Bob: 2 })
  })

  it('[buzz] gives the round to one player when two land together', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })
    const bob = await room.seat({ code, nickname: 'Bob' })

    const round = await runRoundToPlaying(host, 'host.startRound')

    alice.send({ roundId: round.id, type: 'player.buzz' })
    bob.send({ roundId: round.id, type: 'player.buzz' })

    await waitFor(() => errorsIn(bob).length > 0, 'the loser to be told why')

    expect(hostView(host)?.round?.activeBuzz?.playerId).toBe(
      playerView(alice)?.youId
    )
    expect(errorsIn(bob)[0]).toMatchObject({
      code: 'already_buzzed',
      fatal: false
    })
    expect(errorsIn(alice)).toHaveLength(0)
  })

  // Buzzing costs nothing on its own, so without a clock a fast press and an
  // empty head hold the room until the host intervenes. Running out is the same
  // outcome as answering wrong, and the lockout is the load-bearing half: a pass
  // would let that player take the floor straight back.
  it('[buzz] takes the floor back from a player who says nothing, and locks them out', async () => {
    const { code, host } = await room.openRoom({
      ...FAST_GAME,
      mode: { answerWindowMs: 3_000, kind: 'buzzer' }
    })
    const alice = await room.seat({ code, nickname: 'Alice' })
    await room.seat({ code, nickname: 'Bob' })

    const aliceId = playerView(alice)?.youId ?? ''
    const round = await runRoundToPlaying(host, 'host.startRound')

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    const buzz = hostView(host)?.round?.activeBuzz

    expect(buzz?.expiresAt).toBeGreaterThan(buzz?.atServerTime ?? 0)

    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the floor to be taken back',
      6_000
    )

    expect(playerView(alice)?.round?.lockedOutPlayerIds).toContain(aliceId)
    expect(hostView(host)?.round?.activeBuzz).toBeNull()
  })

  it('[buzz] leaves the floor open when the host is the clock', async () => {
    const { code, host } = await room.openRoom({
      ...FAST_GAME,
      mode: { answerWindowMs: null, kind: 'buzzer' }
    })
    const alice = await room.seat({ code, nickname: 'Alice' })

    const round = await runRoundToPlaying(host, 'host.startRound')

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    expect(hostView(host)?.round?.activeBuzz?.expiresAt).toBeNull()

    await sleep(200)

    // Still theirs: nothing but the host ends this one.
    expect(hostView(host)?.phase).toBe('buzzed')
  })

  it('[round] locks a wrong answer out of this round only, and plays on', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })
    const bob = await room.seat({ code, nickname: 'Bob' })

    const aliceId = playerView(alice)?.youId ?? ''
    const first = await runRoundToPlaying(host, 'host.startRound')

    alice.send({ roundId: first.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    host.send({
      playerId: aliceId,
      roundId: first.id,
      type: 'host.judge',
      verdict: MISSED_IT
    })
    await waitFor(
      () => hostView(host)?.phase === 'playing',
      'the clip to resume for the others'
    )

    expect(playerView(alice)?.round?.lockedOutPlayerIds).toContain(aliceId)
    expect(blindtestRound(playerView(alice))?.revealedTrack).toBeNull()

    bob.send({ roundId: first.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'Bob to take over')

    host.send({
      playerId: playerView(bob)?.youId ?? '',
      roundId: first.id,
      type: 'host.judge',
      verdict: WON_IT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    const second = await runRoundToPlaying(host, 'host.nextRound')

    expect(second.lockedOutPlayerIds).toHaveLength(0)
  })

  it('[round] reveals once every player has missed, without waiting out the clip', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })

    const aliceId = playerView(alice)?.youId ?? ''
    const round = await runRoundToPlaying(host, 'host.startRound')

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    host.send({
      playerId: aliceId,
      roundId: round.id,
      type: 'host.judge',
      verdict: MISSED_IT
    })

    await waitFor(
      () => hostView(host)?.phase === 'revealed',
      'the reveal, because nobody is left to answer'
    )
  })

  it('[round] keeps the round running while the host reloads', async () => {
    const { code, host } = await room.openRoom()

    await room.seat({ code, nickname: 'Alice' })

    const round = await runRoundToPlaying(host, 'host.startRound')

    host.close()
    await sleep(30)

    const reconnected = await room.connect(code, hostServerMessageSchema)

    reconnected.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      sessionId: sessionIdOf(host),
      type: 'hello'
    })
    await waitFor(
      () => hostView(reconnected) !== null,
      'the host to reclaim the room'
    )

    expect(hostView(reconnected)?.round?.id).toBe(round.id)
    expect(hostView(reconnected)?.phase).toBe('playing')
  })

  // The highest-value assertion in the repo: it runs over every byte the two
  // players were sent across a whole round, not one hand-picked frame.
  it('[anti-cheat] never sends a player the answer before the reveal', async () => {
    const { code, host } = await room.openRoom()
    const alice = await room.seat({ code, nickname: 'Alice' })
    const bob = await room.seat({ code, nickname: 'Bob' })

    const round = await runRoundToPlaying(host, 'host.startRound')
    const secret = hostContent(host)?.track

    if (secret == null) {
      throw new Error('The host was not given a track to play')
    }

    alice.send({ roundId: round.id, type: 'player.buzz' })
    await waitFor(() => hostView(host)?.phase === 'buzzed', 'the buzz')

    // The window is cut by arrival order, never by reading the field under
    // test: a filter on `revealedTrack` would quietly drop exactly the frames a
    // leak lives in, and pass.
    const beforeTheReveal = [...alice.frames.slice(0), ...bob.frames.slice(0)]

    host.send({
      playerId: playerView(alice)?.youId ?? '',
      roundId: round.id,
      type: 'host.judge',
      verdict: WON_IT
    })
    await waitFor(() => hostView(host)?.phase === 'revealed', 'the reveal')

    const sensitive = beforeTheReveal.filter(
      ({ message }) =>
        message.type === 'room.updated' &&
        (message.view.phase === 'playing' || message.view.phase === 'buzzed')
    )

    expect(sensitive.length).toBeGreaterThan(1)

    for (const { raw } of beforeTheReveal) {
      expect(raw).not.toContain(secret.title)
      expect(raw).not.toContain(secret.artist)
      expect(raw).not.toContain(PREVIEW_HOST)
    }

    // And the reveal, when it comes, does carry it — otherwise the assertion
    // above would pass on a socket that simply never said anything.
    expect(blindtestRound(playerView(alice))?.revealedTrack?.title).toBe(
      secret.title
    )
  })
})
