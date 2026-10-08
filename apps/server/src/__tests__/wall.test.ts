import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_QUIZ_SETTINGS,
  DEFAULT_SLATE_SETTINGS
} from '@taverla/protocol/game'
import {
  openWallPairingResponseSchema,
  wallPairingPollResponseSchema
} from '@taverla/protocol/http'
import type { HostToken } from '@taverla/protocol/identifiers'
import {
  DEFAULT_MODE_SETTINGS,
  DEFAULT_ROOM_SETTINGS,
  type RoomSettings
} from '@taverla/protocol/room'
import { API_ROUTES, fillRoute } from '@taverla/protocol/routes'
import {
  hostServerMessageSchema,
  type WallServerMessage,
  wallServerMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { startRoomHarness } from './node-room-harness'
import {
  CATALOGUE,
  errorsIn,
  FAST_GAME,
  hostContent,
  hostQuestion,
  hostView,
  type Peer,
  playerView,
  QUESTIONS,
  type RoomHarness,
  waitFor
} from './room-harness'

vi.mock('@/infrastructure/questions/question-bank', async () => {
  const { questionBankStub } = await import('./room-harness')

  return questionBankStub()
})

vi.mock('@/infrastructure/music/deezer-client', async () => {
  const { deezerClientStub } = await import('./room-harness')

  return deezerClientStub()
})

const TYPED_QUIZ: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: { ...DEFAULT_QUIZ_SETTINGS, roundDurationMs: 5_000 },
  mode: DEFAULT_MODE_SETTINGS.typed,
  roundCount: 3
}

const SLATE: RoomSettings = {
  ...DEFAULT_ROOM_SETTINGS,
  countdownMs: 20,
  game: { ...DEFAULT_SLATE_SETTINGS, itemCount: 3 },
  mode: DEFAULT_MODE_SETTINGS.typed,
  roundCount: 1
}

const KEY_SECRET = 'Clé du chef: vinaigre'

const wallView = (wall: Peer<WallServerMessage>) => {
  for (const { message } of wall.frames.toReversed()) {
    if (message.type === 'room.updated' || message.type === 'welcome') {
      return message.view
    }
  }

  return null
}

const transcriptOf = (peer: { frames: { raw: string }[] }): string =>
  peer.frames.map(({ raw }) => raw).join('')

describe('the wall', () => {
  let harness: RoomHarness

  beforeEach(async () => {
    harness = await startRoomHarness()
  })

  afterEach(async () => {
    await harness.stop()
  })

  const openWall = async ({
    code,
    hostToken
  }: {
    code: string
    hostToken: HostToken | undefined
  }): Promise<Peer<WallServerMessage>> => {
    const wall = await harness.connect(code, wallServerMessageSchema)

    wall.send({
      hostToken,
      protocolVersion: PROTOCOL_VERSION,
      role: 'wall',
      type: 'hello'
    })

    return wall
  }

  const pairedWall = async (options: {
    code: string
    hostToken: HostToken
  }): Promise<Peer<WallServerMessage>> => {
    const wall = await openWall(options)

    await waitFor(() => wallView(wall) !== null, 'the wall to be welcomed')

    return wall
  }

  it('[wall] is paired over http by the device holding the token, and nobody else', async () => {
    const { code, hostToken } = await harness.openRoom()
    const origin = `http://${harness.origin}`
    const opened = openWallPairingResponseSchema.parse(
      await (
        await fetch(`${origin}${API_ROUTES.walls}`, { method: 'POST' })
      ).json()
    )
    const { pairingCode } = opened
    const poll = () =>
      fetch(
        `${origin}${fillRoute(API_ROUTES.wall, { pairingCode })}?secret=${opened.secret}`
      )
    const vouch = (token: string) =>
      fetch(`${origin}${fillRoute(API_ROUTES.wallPair, { pairingCode })}`, {
        body: JSON.stringify({ hostToken: token, roomCode: code }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      })

    expect(await (await poll()).json()).toEqual({ status: 'waiting' })
    expect((await vouch('ABCDABCD')).status).toBe(403)
    expect((await vouch(hostToken)).status).toBe(204)

    const collected = wallPairingPollResponseSchema.parse(
      await (await poll()).json()
    )

    expect(collected).toEqual({ hostToken, roomCode: code, status: 'paired' })
    expect((await poll()).status).toBe(404)
  })

  it('[wall] refuses a screen that does not hold the room token', async () => {
    const { code } = await harness.openRoom()
    const stranger = await openWall({ code, hostToken: undefined })

    expect(await stranger.whenClosed).toBe(1008)
    expect(errorsIn(stranger)[0]).toMatchObject({
      code: 'wall_not_paired',
      fatal: true
    })
  })

  it('[wall] plays the clip and is never told what it is', async () => {
    const { code, host, hostToken } = await harness.openRoom(FAST_GAME)
    const wall = await pairedWall({ code, hostToken })

    await harness.seat({ code, nickname: 'Zoe' })
    host.send({ type: 'host.startRound' })
    await waitFor(
      () => wallView(wall)?.phase === 'playing',
      'the clip to start on the wall'
    )

    const content = wallView(wall)?.currentContent

    expect(content?.kind === 'blindtest' && content.audioUrl).toBeTruthy()
    expect(hostContent(host)?.track).not.toBeNull()

    for (const track of CATALOGUE) {
      expect(transcriptOf(wall)).not.toContain(track.title)
      expect(transcriptOf(wall)).not.toContain(track.artist)
    }
  })

  it('[wall] never holds a quiz answer before the room does', async () => {
    const { code, host, hostToken } = await harness.openRoom(TYPED_QUIZ)
    const wall = await pairedWall({ code, hostToken })

    await harness.seat({ code, nickname: 'Zoe' })
    await harness.seat({ code, nickname: 'Max' })
    host.send({ type: 'host.startRound' })
    await waitFor(
      () => wallView(wall)?.phase === 'playing',
      'the question to open'
    )
    await waitFor(() => hostQuestion(host) !== null, 'the host to hold it')

    for (const question of QUESTIONS) {
      expect(transcriptOf(wall)).not.toContain(question.answer)
      expect(transcriptOf(wall)).not.toContain(question.note)
    }
  })

  it('[wall] never holds the slate key the host noted', async () => {
    const { code, host, hostToken } = await harness.openRoom(SLATE)
    const wall = await pairedWall({ code, hostToken })

    await harness.seat({ code, nickname: 'Ana' })
    host.send({ type: 'host.startRound' })
    await waitFor(
      () => hostView(host)?.round?.content.kind === 'slate',
      'the sheets to be handed out'
    )

    const roundId = hostView(host)?.round?.id ?? ''

    host.send({
      itemIndex: 0,
      key: KEY_SECRET,
      roundId,
      type: 'host.setItemKey'
    })
    await waitFor(() => {
      const content = hostView(host)?.currentContent

      return content?.kind === 'slate' && content.keys[0] === KEY_SECRET
    }, 'the key to be noted')

    expect(transcriptOf(wall)).not.toContain(KEY_SECRET)
  })

  it('[wall] may send no host frame', async () => {
    const { code, hostToken } = await harness.openRoom(FAST_GAME)
    const wall = await pairedWall({ code, hostToken })

    wall.send({ type: 'host.startRound' })
    await waitFor(() => errorsIn(wall).length > 0, 'the refusal')

    expect(errorsIn(wall)[0]).toMatchObject({
      code: 'host_only_action',
      fatal: false
    })
    expect(wallView(wall)?.phase).toBe('lobby')
  })

  it('[wall] tells the console it is there, and when it goes', async () => {
    const { code, host, hostToken } = await harness.openRoom()

    expect(hostView(host)?.isWallConnected).toBe(false)

    const wall = await pairedWall({ code, hostToken })

    await waitFor(
      () => hostView(host)?.isWallConnected === true,
      'the console to learn of the wall'
    )

    wall.close()
    await waitFor(
      () => hostView(host)?.isWallConnected === false,
      'the console to be the speaker again'
    )
  })

  it('[wall] keeps the room frozen while only the wall is left', async () => {
    const { code, host, hostToken } = await harness.openRoom(FAST_GAME)
    const wall = await pairedWall({ code, hostToken })
    const zoe = await harness.seat({ code, nickname: 'Zoe' })

    host.close()
    await waitFor(
      () => wallView(wall)?.isHostConnected === false,
      'the wall to see the console go'
    )

    const second = await pairedWall({ code, hostToken })

    expect(wallView(second)?.isHostConnected).toBe(false)
    expect(playerView(zoe)?.isHostConnected).toBe(false)
  })

  it('[wall] is not displaced by a console taking the room with the token', async () => {
    const { code, hostToken } = await harness.openRoom()
    const wall = await pairedWall({ code, hostToken })
    const takeover = await harness.connect(code, hostServerMessageSchema)

    takeover.send({
      hostToken,
      protocolVersion: PROTOCOL_VERSION,
      role: 'host',
      type: 'hello'
    })
    await waitFor(() => hostView(takeover) !== null, 'the takeover')

    expect(errorsIn(wall)).toHaveLength(0)
  })
})
