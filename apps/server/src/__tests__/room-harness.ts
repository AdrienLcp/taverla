import { serve } from '@hono/node-server'
import type { z } from 'zod'

import type { ClientMessage } from '@taverla/protocol/client-message'
import { DEFAULT_BLINDTEST_SETTINGS } from '@taverla/protocol/game'
import type { CreateRoomResponse } from '@taverla/protocol/http'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type HostRoundContent,
  type RoomSettings,
  type RoundContent,
  type RoundView
} from '@taverla/protocol/room'
import type { HalvesVerdict, Verdict } from '@taverla/protocol/scoring'
import {
  type HostServerMessage,
  hostServerMessageSchema,
  type PlayerServerMessage,
  playerServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

/**
 * One catalogue for every socket suite. The anti-cheat assertion searches raw
 * frames for these exact strings, so a per-file copy that drifted would still
 * pass while proving nothing.
 */
export const CATALOGUE = [
  { artist: 'Daft Punk', coverUrl: null, id: '1', title: 'Around the World' },
  { artist: 'Justice', coverUrl: null, id: '2', title: 'Genesis' },
  { artist: 'Air', coverUrl: null, id: '3', title: 'Sexy Boy' },
  { artist: 'Cassius', coverUrl: null, id: '4', title: '1999' }
]

export const PREVIEW_HOST = 'preview.test'

/**
 * Three questions, and every string in them is searched for by the anti-cheat
 * assertion — the answers, the accepted spellings and the notes. A suite that
 * kept its own copy would drift and still pass.
 */
export const QUESTIONS = [
  {
    accepted: ['Cervin'],
    answer: 'Le Cervin',
    category: 'geography',
    decoys: ['Le Chasseral', 'Le Suchet', 'Le Roti'],
    id: 'question-1',
    note: 'Zermatt sits at its foot.',
    prompt: 'Which mountain is the most recognisable in Switzerland?'
  },
  {
    accepted: [],
    answer: 'Quatre',
    category: 'geography',
    decoys: ['Trois', 'Deux', 'Une'],
    id: 'question-2',
    note: 'Romansh is the fourth, spoken in Grisons.',
    prompt: 'How many national languages does Switzerland have?'
  },
  {
    accepted: [],
    answer: 'Zurich',
    category: 'geography',
    decoys: ['Lausanne', 'Geneva', 'Basel'],
    id: 'question-3',
    note: 'More than thirty per cent of its residents are foreign.',
    prompt: 'Which is the largest city in Switzerland by area?'
  }
]

/**
 * The bundled bank replaced by three questions, which also keeps the suite from
 * parsing eighteen hundred of them on every run.
 */
export const questionBankStub = () => ({
  drawQuestion: ({ playedIds }: { playedIds: ReadonlySet<string> }) =>
    QUESTIONS.find((question) => !playedIds.has(question.id)) ?? null,
  hostQuestionOf: <TQuestion>(question: TQuestion) => question,
  QUESTION_BANK_ATTRIBUTION: {
    author: 'Nobody',
    licence: 'CC BY-SA 4.0',
    source: 'Test bank',
    url: 'https://example.test'
  }
})

/**
 * A `vi.mock` factory may not close over anything the test file declares, so
 * the stub is built here and imported from inside the factory.
 */
export const deezerClientStub = () => ({
  fetchHostTrack: async (trackId: string) => {
    const found = CATALOGUE.find((track) => track.id === trackId)

    return found === undefined
      ? { error: 'no_content_available', status: 'failure' }
      : {
          data: {
            ...found,
            previewUrl: `https://${PREVIEW_HOST}/${trackId}.mp3`
          },
          status: 'success'
        }
  },
  fetchTracksFor: async () => ({ data: CATALOGUE, status: 'success' })
})

/**
 * The mode is pinned rather than inherited: the suites built on this one are
 * about buzzing, and a fixture that follows whatever the default happens to be
 * stops testing what its name says the day the default moves.
 */
export const FAST_GAME: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: { ...DEFAULT_BLINDTEST_SETTINGS, roundDurationMs: 5_000 },
  mode: DEFAULT_MODE_SETTINGS.buzzer,
  roundCount: 3
}

/** The blind test judges two halves; the shape is noise at every call site. */
export const halves = (
  titleCorrect: boolean,
  artistCorrect: boolean
): Verdict => ({ artistCorrect, kind: 'halves', titleCorrect })

/**
 * The halves the reader has banked, or `null` in a game judged on one claim.
 * `yourVerdict` carries the whole union since the quiz needed the same feedback
 * a pair of halves does.
 */
export const bankedHalves = (
  view: { yourVerdict: Verdict | null } | null
): HalvesVerdict | null =>
  view?.yourVerdict?.kind === 'halves' ? view.yourVerdict : null

export type Peer<TMessage> = {
  close: () => void
  /** `receivedAt` is this device's clock, which the clock suite deliberately skews. */
  frames: { message: TMessage; raw: string; receivedAt: number }[]
  send: (message: ClientMessage) => void
  whenClosed: Promise<number>
}

export type RoomHarness = {
  connect: <TMessage>(
    code: string,
    schema: z.ZodType<TMessage>
  ) => Promise<Peer<TMessage>>
  openRoom: (
    settings?: RoomSettings,
    nickname?: string
  ) => Promise<{ code: string; host: Peer<HostServerMessage> }>
  /** `host:port`, for the suites that exercise the HTTP surface rather than a game. */
  origin: string
  seat: (options: {
    code: string
    nickname: string
    sessionId?: string
  }) => Promise<Peer<PlayerServerMessage>>
  stop: () => Promise<void>
}

export const sleep = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs))

export const waitFor = async (
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

export const hostView = (host: Peer<HostServerMessage>) => {
  for (const { message } of [...host.frames].reverse()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      return message.view
    }
  }

  return null
}

export const playerView = (player: Peer<PlayerServerMessage>) => {
  for (const { message } of [...player.frames].reverse()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      return message.view
    }
  }

  return null
}

/**
 * The blind test's arm of a view's round, or `null` when the room is on another
 * game. Every suite here plays a blind test, so the narrowing is noise at the
 * call site and belongs once, in the harness.
 */
export const blindtestRound = (
  view: { round: RoundView | null } | null
): Extract<RoundContent, { kind: 'blindtest' }> | null => {
  const content = view?.round?.content

  return content?.kind === 'blindtest' ? content : null
}

/** The same narrowing over the half only the host is sent. */
export const hostContent = (
  host: Peer<HostServerMessage>
): Extract<HostRoundContent, { kind: 'blindtest' }> | null => {
  const content = hostView(host)?.currentContent

  return content?.kind === 'blindtest' ? content : null
}

export const quizRound = (
  view: { round: RoundView | null } | null
): Extract<RoundContent, { kind: 'quiz' }> | null => {
  const content = view?.round?.content

  return content?.kind === 'quiz' ? content : null
}

export const hostQuestion = (host: Peer<HostServerMessage>) => {
  const content = hostView(host)?.currentContent

  return content?.kind === 'quiz' ? content.question : null
}

export const errorsIn = <TMessage extends { type: string }>(
  peer: Peer<TMessage>
) =>
  peer.frames
    .map(({ message }) => message)
    .filter((message) => message.type === 'error')

/**
 * Imported dynamically so a `vi.mock` in the calling suite is registered before
 * the app pulls its music client in.
 */
export const startRoomHarness = async (): Promise<RoomHarness> => {
  const { createApp } = await import('@/app')
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

  const origin = `localhost:${address.port}`
  const openSockets: WebSocket[] = []

  const connect = async <TMessage>(
    code: string,
    schema: z.ZodType<TMessage>
  ): Promise<Peer<TMessage>> => {
    const socket = new WebSocket(`ws://${origin}/ws/rooms/${code}`)
    const frames: Peer<TMessage>['frames'] = []

    openSockets.push(socket)

    socket.addEventListener('message', (event) => {
      const raw = String(event.data)

      frames.push({
        message: schema.parse(JSON.parse(raw)),
        raw,
        receivedAt: Date.now()
      })
    })

    const whenClosed = new Promise<number>((resolve) => {
      socket.addEventListener('close', (event) => {
        resolve(event.code)
      })
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
      },
      whenClosed
    }
  }

  /**
   * A `nickname` seats the host as a player too — the phone in the middle.
   *
   * The door takes the game and the socket takes everything else about it,
   * which is what a console does: `POST /api/rooms` decides which arm of
   * `round.content` the room will be rendering, and the settings frame that
   * follows tunes it.
   */
  const openRoom = async (
    settings: RoomSettings = FAST_GAME,
    nickname?: string
  ) => {
    const response = await fetch(`http://${origin}/api/rooms`, {
      body: JSON.stringify({ game: settings.game?.kind }),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    const { code } = (await response.json()) as CreateRoomResponse

    const host = await connect(code, hostServerMessageSchema)

    host.send({
      nickname,
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(() => hostView(host) !== null, 'the host to be seated')
    host.send({ settings, type: 'host.updateSettings' })

    return { code, host }
  }

  const seat = async ({
    code,
    nickname,
    sessionId
  }: {
    code: string
    nickname: string
    sessionId?: string
  }) => {
    const player = await connect(code, playerServerMessageSchema)

    player.send({
      nickname,
      protocolVersion: PROTOCOL_VERSION,
      role: 'player',
      sessionId,
      type: 'hello'
    })
    await waitFor(() => playerView(player) !== null, `${nickname} to be seated`)

    return player
  }

  // `close` waits on every live connection, and a blind test socket is
  // deliberately long-lived — without hanging up first the hook times out
  // rather than the server shutting down.
  const stop = async () => {
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

  return { connect, openRoom, origin, seat, stop }
}
