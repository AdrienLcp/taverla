import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { z } from 'zod'

import type {
  ClientMessage,
  ConnectionRole
} from '@taverla/protocol/client-message'
import { decodeMessage, encodeMessage } from '@taverla/protocol/codec'
import type { RoomCode } from '@taverla/protocol/identifiers'
import {
  type ProtocolErrorMessage,
  protocolErrorMessageSchema,
  timePongMessageSchema
} from '@taverla/protocol/server-message'
import { PROTOCOL_VERSION } from '@taverla/protocol/version'

import { refusalVoidsSeat } from '@taverla/core/room/session-memory'
import {
  type ClockEstimate,
  type ClockSample,
  estimateClockOffset
} from '@taverla/core/time/clock-sync'

import { socketOrigin } from '@/infrastructure/browser'
import {
  ensureSessionId,
  forgetSessionId,
  readHostToken
} from '@/infrastructure/storage/session-storage'

import { useSettledStatus } from './use-settled-status'

/**
 * `closed` and `refused` both mean "no socket", and the difference is the whole
 * point: `closed` is still counting down to another attempt, `refused` is the
 * server having said why and the client having stopped. A screen that shows one
 * as the other tells the user to wait for a reconnection that will never come.
 */
export type SocketStatus = 'connecting' | 'open' | 'closed' | 'refused'

export type RoomSocket = {
  /**
   * Forgets the last refusal. The socket itself only clears one on reconnect,
   * which is far too long a life for a message about a moment: a room that has
   * moved to another phase is being told why something it is no longer doing was
   * refused. The connection hooks call this when the phase turns over.
   */
  clearError: () => void
  clock: ClockEstimate | null
  error: ProtocolErrorMessage | null
  /**
   * Opens a fresh socket after a **refusal**, and does nothing on a socket that
   * had not given up. A refusal is final until something changes on this side —
   * a screen handed the room's token is the case that exists for — so this is a
   * press rather than another timer.
   */
  retry: () => void
  /** `false` when the frame could not be written — the socket is down. */
  send: (message: ClientMessage) => boolean
  status: SocketStatus
}

/**
 * The two frames this hook answers itself. Everything else is forwarded
 * untouched to the role-specific hook, which decodes it against the schema for
 * *its* role — the reason a player's decoder never even describes a host view.
 */
const controlFrameSchema = z.discriminatedUnion('type', [
  timePongMessageSchema,
  protocolErrorMessageSchema
])

const CLOCK_SAMPLE_LIMIT = 8
/** A burst on connect, so the first countdown is already synchronised. */
const OPENING_PING_COUNT = 3
const OPENING_PING_SPACING_MS = 250
const PING_INTERVAL_MS = 5_000
const RECONNECT_BASE_MS = 500
const RECONNECT_CEILING_MS = 8_000

/**
 * Owns the socket, the reconnect policy and the clock handshake. It is the only
 * module in the app that touches `WebSocket`.
 */
export const useRoomSocket = ({
  enabled,
  nickname,
  onFrame,
  role,
  roomCode
}: {
  enabled: boolean
  nickname: string | null
  onFrame: (raw: string) => void
  role: ConnectionRole
  roomCode: RoomCode
}): RoomSocket => {
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connecting')
  const [error, setError] = useState<ProtocolErrorMessage | null>(null)
  const [clock, setClock] = useState<ClockEstimate | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const samplesRef = useRef<ClockSample[]>([])
  const reconnectRef = useRef<(() => void) | null>(null)

  // An Effect Event rather than a dependency: a fresh `onFrame` on every render
  // would tear the socket down and rebuild it on every render too.
  const forwardFrame = useEffectEvent(onFrame)

  useEffect(() => {
    if (!enabled) {
      setSocketStatus('closed')

      return
    }

    let disposed = false
    let giveUp = false
    let attempt = 0
    let reconnectTimer: number | undefined
    let pingTimer: number | undefined
    const openingPingTimers: number[] = []

    const ping = (socket: WebSocket): void => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          encodeMessage({ clientSentAt: Date.now(), type: 'time.ping' })
        )
      }
    }

    const recordPongAt = (sample: ClockSample): void => {
      samplesRef.current = [...samplesRef.current, sample].slice(
        -CLOCK_SAMPLE_LIMIT
      )
      setClock(estimateClockOffset(samplesRef.current))
    }

    const connect = (): void => {
      const socket = new WebSocket(`${socketOrigin()}/ws/rooms/${roomCode}`)

      socketRef.current = socket
      setSocketStatus('connecting')

      socket.addEventListener('open', () => {
        attempt = 0
        setSocketStatus('open')
        setError(null)
        // Everything the hello carries is read here rather than when the effect
        // ran: a refusal can have voided the seat since, and a screen handed the
        // room's token holds it only from the press that reopens this socket.
        socket.send(
          encodeMessage({
            hostToken:
              role === 'player'
                ? undefined
                : (readHostToken(roomCode) ?? undefined),
            nickname: nickname ?? undefined,
            protocolVersion: PROTOCOL_VERSION,
            role,
            sessionId: ensureSessionId({ role, roomCode }),
            type: 'hello'
          })
        )

        for (let index = 0; index < OPENING_PING_COUNT; index++) {
          openingPingTimers.push(
            window.setTimeout(() => {
              ping(socket)
            }, index * OPENING_PING_SPACING_MS)
          )
        }

        pingTimer = window.setInterval(() => {
          ping(socket)
        }, PING_INTERVAL_MS)
      })

      socket.addEventListener('message', (event) => {
        if (typeof event.data !== 'string') {
          return
        }

        const control = decodeMessage(controlFrameSchema, event.data)

        if (control.status === 'failure') {
          forwardFrame(event.data)

          return
        }

        if (control.message.type === 'time.pong') {
          recordPongAt({
            clientReceivedAt: Date.now(),
            clientSentAt: control.message.clientSentAt,
            serverTime: control.message.serverTime
          })

          return
        }

        setError(control.message)

        // The end of the line is what the frame says, not what the socket does
        // next. Waiting for a close left a player on a stale scoreboard when
        // the host closed the room: it is the one fatal refusal a socket can
        // carry while staying open, since the server is answering a *third*
        // party.
        if (control.message.fatal) {
          giveUp = true
          setSocketStatus('refused')

          if (refusalVoidsSeat(control.message.code)) {
            forgetSessionId({ role, roomCode })
          }

          socket.close()
        }
      })

      socket.addEventListener('close', () => {
        window.clearInterval(pingTimer)
        setSocketStatus(giveUp ? 'refused' : 'closed')

        if (disposed || giveUp) {
          return
        }

        attempt += 1
        reconnectTimer = window.setTimeout(
          connect,
          Math.min(RECONNECT_CEILING_MS, RECONNECT_BASE_MS * 2 ** (attempt - 1))
        )
      })
    }

    // A refusal is final until something changes on this side, so the way back
    // is a press rather than a dependency: nothing about the socket's inputs has
    // changed, and the value that did — the room's token — is read on open.
    reconnectRef.current = () => {
      if (!giveUp) {
        return
      }

      giveUp = false
      attempt = 0
      connect()
    }

    connect()

    return () => {
      disposed = true
      reconnectRef.current = null
      window.clearTimeout(reconnectTimer)
      window.clearInterval(pingTimer)

      for (const timer of openingPingTimers) {
        window.clearTimeout(timer)
      }

      socketRef.current?.close()
      socketRef.current = null
    }
  }, [enabled, nickname, role, roomCode])

  const { reveal, status } = useSettledStatus(socketStatus)

  const send = useCallback(
    (message: ClientMessage): boolean => {
      const socket = socketRef.current

      if (socket === null || socket.readyState !== WebSocket.OPEN) {
        // The frame is gone, so the calm the blink was being given ends here.
        reveal()

        return false
      }

      socket.send(encodeMessage(message))

      return true
    },
    [reveal]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(() => {
    reconnectRef.current?.()
  }, [])

  return { clearError, clock, error, retry, send, status }
}
