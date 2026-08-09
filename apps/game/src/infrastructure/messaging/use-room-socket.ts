import { useCallback, useEffect, useRef, useState } from 'react'
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

import {
  type ClockEstimate,
  type ClockSample,
  estimateClockOffset
} from '@taverla/core/time/clock-sync'

import { socketOrigin } from '@/infrastructure/env'
import { ensureSessionId } from '@/infrastructure/storage/session-storage'

/**
 * `closed` and `refused` both mean "no socket", and the difference is the whole
 * point: `closed` is still counting down to another attempt, `refused` is the
 * server having said why and the client having stopped. A screen that shows one
 * as the other tells the user to wait for a reconnection that will never come.
 */
export type SocketStatus = 'connecting' | 'open' | 'closed' | 'refused'

export type RoomSocket = {
  clock: ClockEstimate | null
  error: ProtocolErrorMessage | null
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
  const [status, setStatus] = useState<SocketStatus>('connecting')
  const [error, setError] = useState<ProtocolErrorMessage | null>(null)
  const [clock, setClock] = useState<ClockEstimate | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const samplesRef = useRef<ClockSample[]>([])
  const onFrameRef = useRef(onFrame)

  // The latest-ref pattern rather than a dependency: a fresh `onFrame` on every
  // render would tear the socket down and rebuild it on every render too.
  useEffect(() => {
    onFrameRef.current = onFrame
  })

  useEffect(() => {
    if (!enabled) {
      setStatus('closed')

      return
    }

    let disposed = false
    let giveUp = false
    let attempt = 0
    let reconnectTimer: number | undefined
    let pingTimer: number | undefined
    const openingPingTimers: number[] = []

    const sessionId = ensureSessionId({ role, roomCode })

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
      setStatus('connecting')

      socket.addEventListener('open', () => {
        attempt = 0
        setStatus('open')
        setError(null)
        socket.send(
          encodeMessage({
            nickname: nickname ?? undefined,
            protocolVersion: PROTOCOL_VERSION,
            role,
            sessionId,
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
          onFrameRef.current(event.data)

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
        giveUp = giveUp || control.message.fatal
      })

      socket.addEventListener('close', () => {
        window.clearInterval(pingTimer)
        setStatus(giveUp ? 'refused' : 'closed')

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

    connect()

    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
      window.clearInterval(pingTimer)

      for (const timer of openingPingTimers) {
        window.clearTimeout(timer)
      }

      socketRef.current?.close()
      socketRef.current = null
    }
  }, [enabled, nickname, role, roomCode])

  const send = useCallback((message: ClientMessage): boolean => {
    const socket = socketRef.current

    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(encodeMessage(message))

    return true
  }, [])

  return { clock, error, send, status }
}
