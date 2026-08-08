import { describe, expect, it } from 'vitest'

import { clientMessageSchema } from './client-message'
import { decodeMessage, encodeChecked } from './codec'
import type { PlayerRoomView } from './room'
import { playerServerMessageSchema } from './server-message'
import { PROTOCOL_VERSION } from './version'

const playerView: PlayerRoomView = {
  code: 'K3M9',
  phase: 'playing',
  players: [{ id: 'p1', isConnected: true, nickname: 'Alice', score: 2 }],
  round: {
    activeBuzz: null,
    audioStartsAt: 1_700_000_000_000,
    awards: [],
    id: 'r1',
    index: 1,
    lockedOutPlayerIds: [],
    revealedTrack: null
  },
  settings: {
    countdownMs: 3000,
    playbackDurationMs: 30_000,
    roundCount: 10,
    source: { kind: 'chart' }
  },
  youId: 'p1'
}

describe('decodeMessage', () => {
  it('[codec] accepts a well-formed frame', () => {
    const raw = JSON.stringify({
      nickname: 'Alice',
      protocolVersion: PROTOCOL_VERSION,
      role: 'player',
      type: 'hello'
    })

    expect(decodeMessage(clientMessageSchema, raw).status).toBe('success')
  })

  it('[codec] rejects a frame that is not JSON', () => {
    expect(decodeMessage(clientMessageSchema, 'not json at all')).toEqual({
      reason: 'frame is not valid JSON',
      status: 'failure'
    })
  })

  it('[codec] rejects valid JSON that is not a message', () => {
    const raw = JSON.stringify({ type: 'host.launchNukes' })

    expect(decodeMessage(clientMessageSchema, raw).status).toBe('failure')
  })

  // The reason string is logged. A rejected frame can carry a nickname, a
  // session id or a signed audio URL, and none of that belongs in a log line.
  it('[codec] never echoes the rejected value back in the reason', () => {
    const secret = 'session-id-that-must-not-be-logged'
    const raw = JSON.stringify({
      role: 'player',
      sessionId: secret,
      type: 'hello'
    })

    const result = decodeMessage(clientMessageSchema, raw)

    expect(result.status).toBe('failure')
    expect(result.status === 'failure' && result.reason).not.toContain(secret)
  })
})

describe('encodeChecked', () => {
  // The whole anti-cheat claim rests on this. TypeScript's excess property
  // check does not fire on a value passed through a variable, so a host view
  // reaching a player frame is a plausible mistake rather than a far-fetched
  // one. Zod's strip is the net under it.
  it('[anti-cheat] drops host-only fields from a player frame', () => {
    const leakyView = {
      ...playerView,
      currentTrack: {
        artist: 'Daft Punk',
        coverUrl: null,
        id: '3135556',
        previewUrl: 'https://cdnt-preview.dzcdn.net/leak.mp3',
        title: 'Harder, Better, Faster, Stronger'
      },
      remainingPoolSize: 7
    }

    const encoded = encodeChecked(playerServerMessageSchema, {
      type: 'room.updated' as const,
      view: leakyView
    })

    expect(encoded).not.toContain('Daft Punk')
    expect(encoded).not.toContain('Harder, Better, Faster, Stronger')
    expect(encoded).not.toContain('cdnt-preview')
    expect(JSON.parse(encoded).view.youId).toBe('p1')
  })

  it('[codec] throws when the server builds a message it cannot honour', () => {
    const invalid = {
      type: 'room.updated' as const,
      view: { ...playerView, code: 'nope!' }
    }

    expect(() => encodeChecked(playerServerMessageSchema, invalid)).toThrow()
  })
})
