import { serve } from '@hono/node-server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

import type { ClientMessage } from '@taverla/protocol/client-message'
import type { CreateRoomResponse } from '@taverla/protocol/http'
import type { RoomSettings } from '@taverla/protocol/room'
import {
  type HostServerMessage,
  hostServerMessageSchema,
  type PlayerServerMessage,
  playerServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

const { CATALOGUE } = vi.hoisted(() => ({
  CATALOGUE: [
    { artist: 'Daft Punk', coverUrl: null, id: '1', title: 'Around the World' },
    { artist: 'Justice', coverUrl: null, id: '2', title: 'Genesis' },
    { artist: 'Air', coverUrl: null, id: '3', title: 'Sexy Boy' },
    { artist: 'Cassius', coverUrl: null, id: '4', title: '1999' }
  ]
}))

vi.mock('@/infrastructure/music/deezer-client', () => ({
  fetchHostTrack: async (trackId: string) => {
    const found = CATALOGUE.find((track) => track.id === trackId)

    return found === undefined
      ? { error: 'no_tracks_available', status: 'failure' }
      : {
          data: { ...found, previewUrl: `https://preview.test/${trackId}.mp3` },
          status: 'success'
        }
  },
  fetchTracksFor: async () => ({ data: CATALOGUE, status: 'success' })
}))

const { createApp } = await import('@/app')

const FAST_GAME: RoomSettings = {
  autoAdvanceMs: null,
  countdownMs: 20,
  playbackDurationMs: 5_000,
  roundCount: 3,
  source: { genreId: 0, kind: 'chart' }
}

const WON_IT = { artistCorrect: true, titleCorrect: true }
const MISSED_IT = { artistCorrect: false, titleCorrect: false }

let origin: string
let stop: () => Promise<void>

const openSockets: WebSocket[] = []

const sleep = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs))

beforeEach(async () => {
  const { app, injectWebSocket } = createApp()

  const started = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const server = serve({ fetch: app.fetch, port: 0 }, () => {
      resolve(server)
    })

    injectWebSocket(server)
  })

  const address = started.address()

  if (address === null || typeof address === 'string') {
    throw new Error('The test server did not report a port')
  }

  origin = `localhost:${address.port}`

  // `close` waits on every live connection, and a blind test socket is
  // deliberately long-lived — without hanging up first the hook times out
  // rather than the server shutting down.
  stop = async () => {
    for (const socket of openSockets.splice(0)) {
      socket.close()
    }

    await sleep(10)

    if ('closeAllConnections' in started) {
      started.closeAllConnections()
    }

    await new Promise<void>((resolve) => {
      started.close(() => {
        resolve()
      })
    })
  }
})

afterEach(async () => {
  await stop()
})

type Peer<TMessage> = {
  close: () => void
  frames: { message: TMessage; raw: string }[]
  send: (message: ClientMessage) => void
}

const connect = async <TMessage>(
  code: string,
  schema: z.ZodType<TMessage>
): Promise<Peer<TMessage>> => {
  const socket = new WebSocket(`ws://${origin}/ws/rooms/${code}`)
  const frames: Peer<TMessage>['frames'] = []

  openSockets.push(socket)

  socket.addEventListener('message', (event) => {
    const raw = String(event.data)

    frames.push({ message: schema.parse(JSON.parse(raw)), raw })
  })

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => {
      resolve()
    })
    socket.addEventListener('error', () => {
      reject(new Error('The socket refused to open'))
    })
  })

  return {
    close: () => {
      socket.close()
    },
    frames,
    send: (message) => {
      socket.send(JSON.stringify(message))
    }
  }
}

const openRoom = async () => {
  const response = await fetch(`http://${origin}/api/rooms`, { method: 'POST' })
  const { code } = (await response.json()) as CreateRoomResponse

  const host = await connect(code, hostServerMessageSchema)

  host.send({ protocolVersion: PROTOCOL_VERSION, role: 'host', type: 'hello' })
  await waitFor(() => hostView(host) !== null, 'the host to be seated')
  host.send({ settings: FAST_GAME, type: 'host.updateSettings' })

  return { code, host }
}

const seat = async (code: string, nickname: string) => {
  const player = await connect(code, playerServerMessageSchema)

  player.send({
    nickname,
    protocolVersion: PROTOCOL_VERSION,
    role: 'player',
    type: 'hello'
  })
  await waitFor(() => playerView(player) !== null, `${nickname} to be seated`)

  return player
}

const hostView = (host: Peer<HostServerMessage>) => {
  for (const { message } of [...host.frames].reverse()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      return message.view
    }
  }

  return null
}

const playerView = (player: Peer<PlayerServerMessage>) => {
  for (const { message } of [...player.frames].reverse()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      return message.view
    }
  }

  return null
}

const errorsIn = <TMessage extends { type: string }>(peer: Peer<TMessage>) =>
  peer.frames
    .map(({ message }) => message)
    .filter((message) => message.type === 'error')

const waitFor = async (
  isReady: () => boolean,
  label: string,
  timeoutMs = 2_000
): Promise<void> => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (isReady()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 5))
  }

  throw new Error(`Timed out waiting for ${label}`)
}

const runRoundToPlaying = async (
  host: Peer<HostServerMessage>,
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
    const { code, host } = await openRoom()
    const alice = await seat(code, 'Alice')
    const bob = await seat(code, 'Bob')

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

      expect(hostView(host)?.round?.revealedTrack?.title).toBeTypeOf('string')
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

  it('[buzz] gives the round to one thumb when two land together', async () => {
    const { code, host } = await openRoom()
    const alice = await seat(code, 'Alice')
    const bob = await seat(code, 'Bob')

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

  it('[round] locks a wrong answer out of this round only, and plays on', async () => {
    const { code, host } = await openRoom()
    const alice = await seat(code, 'Alice')
    const bob = await seat(code, 'Bob')

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
    expect(playerView(alice)?.round?.revealedTrack).toBeNull()

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
    const { code, host } = await openRoom()
    const alice = await seat(code, 'Alice')

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
    const { code, host } = await openRoom()

    await seat(code, 'Alice')

    const round = await runRoundToPlaying(host, 'host.startRound')

    host.close()
    await sleep(30)

    const reconnected = await connect(code, hostServerMessageSchema)

    reconnected.send({
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
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
  // phones were sent across a whole round, not one hand-picked frame.
  it('[anti-cheat] never sends a player the answer before the reveal', async () => {
    const { code, host } = await openRoom()
    const alice = await seat(code, 'Alice')
    const bob = await seat(code, 'Bob')

    const round = await runRoundToPlaying(host, 'host.startRound')
    const secret = hostView(host)?.currentTrack

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
      expect(raw).not.toContain('preview.test')
    }

    // And the reveal, when it comes, does carry it — otherwise the assertion
    // above would pass on a socket that simply never said anything.
    expect(playerView(alice)?.round?.revealedTrack?.title).toBe(secret.title)
  })
})
