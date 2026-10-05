import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

import type { GameKind } from '@taverla/protocol/game'
import type { CreateRoomResponse } from '@taverla/protocol/http'
import {
  type HostToken,
  playerIdSchema,
  type RoomCode,
  sessionIdSchema
} from '@taverla/protocol/identifiers'
import type { Locale } from '@taverla/protocol/locale'

import { newRoom } from '@/domain/room/new-room'
import type { Room } from '@/domain/room/room'
import { nowMs } from '@/infrastructure/clock'
import { newHostToken } from '@/infrastructure/ids'
import type { Connection } from '@/infrastructure/messaging/connection'
import {
  commitRoom,
  createRoomEngine,
  type RoomEngine
} from '@/infrastructure/messaging/room-engine'
import { wakeRoom } from '@/infrastructure/messaging/round-conductor'
import {
  closeSocket,
  type JoinedSocket,
  receiveFrame
} from '@/infrastructure/messaging/socket-handler'

const ROOM_KEY = 'room'

/**
 * Everything a `Connection` holds but its `send`, written onto the socket so a
 * hibernated object knows who is behind each one when it wakes. A socket that
 * has not said `hello` carries none, and neither does one the room let go of.
 */
const seatAttachmentSchema = z.discriminatedUnion('role', [
  z.object({
    playerId: playerIdSchema.nullable(),
    role: z.literal('host'),
    sessionId: sessionIdSchema
  }),
  z.object({
    playerId: playerIdSchema,
    role: z.literal('player'),
    sessionId: sessionIdSchema
  }),
  z.object({
    playerId: z.null(),
    role: z.literal('wall'),
    sessionId: sessionIdSchema
  })
])

/**
 * `ws` dropped a frame sent to a closing socket where the Workers runtime
 * throws, and a client's ping can still land after the room closed it.
 */
const sendWhileOpen = (socket: WebSocket, payload: string) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(payload)
  }
}

const attachmentOf = ({
  playerId,
  role,
  sessionId
}: Connection): z.infer<typeof seatAttachmentSchema> =>
  seatAttachmentSchema.parse({ playerId, role, sessionId })

/**
 * One room: its state in the object's own storage, its sockets through the
 * hibernation API, its deadlines as the object's single alarm. Nothing here
 * outlives an eviction but what was written, which is why every change ends
 * in `persist` and every timer is read back off the room.
 */
export class RoomObject extends DurableObject<Env> {
  private engine: RoomEngine | null = null

  /**
   * One `Connection` per socket for as long as this instance lives, because
   * the engine compares them by identity and mutates a host's seat in place.
   * Rebuilt from the attachments after a wake.
   */
  private readonly connections = new Map<WebSocket, Connection>()

  /** The socket whose frame is being handled: the only one a `hello` can add. */
  private arriving: WebSocket | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)

    const stored = ctx.storage.kv.get<Room>(ROOM_KEY)

    if (stored !== undefined) {
      this.engine = this.engineFor(stored)
    }
  }

  open({
    code,
    game,
    locale
  }: {
    code: RoomCode
    game: GameKind | null
    locale: Locale
  }): CreateRoomResponse | null {
    if (this.engine !== null) {
      return null
    }

    const engine = this.engineFor(
      newRoom({
        code,
        game,
        hostToken: newHostToken(),
        locale,
        now: nowMs()
      })
    )

    this.engine = engine
    commitRoom(engine)

    return { code, hostToken: engine.room.hostToken }
  }

  exists(): boolean {
    return this.engine !== null
  }

  isHostedWith(hostToken: HostToken): boolean {
    return this.engine?.room.hostToken === hostToken
  }

  override fetch(request: Request): Response {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket', { status: 426 })
    }

    const { 0: client, 1: server } = new WebSocketPair()

    this.ctx.acceptWebSocket(server)

    return new Response(null, { status: 101, webSocket: client })
  }

  override webSocketMessage(
    socket: WebSocket,
    message: string | ArrayBuffer
  ): void {
    this.arriving = socket

    try {
      receiveFrame({
        findEngine: () => this.engine,
        joined: this.joinedOf(socket),
        raw: message,
        socket: {
          close: (code, reason) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.close(code, reason)
            }
          },
          send: (payload) => {
            sendWhileOpen(socket, payload)
          }
        }
      })
    } finally {
      this.arriving = null
    }
  }

  override webSocketClose(socket: WebSocket): void {
    closeSocket(this.joinedOf(socket))
    this.connections.delete(socket)
  }

  override webSocketError(socket: WebSocket): void {
    this.webSocketClose(socket)
  }

  override alarm(): void {
    if (this.engine !== null) {
      wakeRoom(this.engine)
    }
  }

  private joinedOf(socket: WebSocket): JoinedSocket | null {
    const connection = this.connectionOf(socket)

    return connection === null || this.engine === null
      ? null
      : { connection, engine: this.engine }
  }

  private connectionOf(socket: WebSocket): Connection | null {
    const known = this.connections.get(socket)

    if (known !== undefined) {
      return known
    }

    const attachment = seatAttachmentSchema.safeParse(
      socket.deserializeAttachment()
    )

    if (!attachment.success) {
      return null
    }

    const connection: Connection = {
      ...attachment.data,
      send: (payload) => {
        sendWhileOpen(socket, payload)
      }
    }

    this.connections.set(socket, connection)

    return connection
  }

  private socketOf(connection: Connection): WebSocket | null {
    for (const [socket, known] of this.connections) {
      if (known === connection) {
        return socket
      }
    }

    return null
  }

  private engineFor(room: Room): RoomEngine {
    return createRoomEngine(room, {
      connections: {
        add: (connection) => {
          if (this.arriving === null) {
            return
          }

          this.arriving.serializeAttachment(attachmentOf(connection))
          this.connections.set(this.arriving, connection)
        },
        all: () =>
          this.ctx
            .getWebSockets()
            .map((socket) => this.connectionOf(socket))
            .filter((connection) => connection !== null),
        remove: (connection) => {
          const socket = this.socketOf(connection)

          if (socket !== null) {
            socket.serializeAttachment(null)
            this.connections.delete(socket)
          }
        }
      },
      discard: () => {
        this.engine = null
        this.ctx.storage.kv.delete(ROOM_KEY)
        void this.ctx.storage.deleteAlarm()
      },
      now: nowMs,
      persist: (current) => {
        this.ctx.storage.kv.put(ROOM_KEY, current)

        // A host's seat is taken off its connection in place, wherever the
        // roster loses it, so every attachment is rewritten with the room.
        for (const [socket, connection] of this.connections) {
          socket.serializeAttachment(attachmentOf(connection))
        }
      },
      wakeAt: (at) => {
        void (at === null
          ? this.ctx.storage.deleteAlarm()
          : this.ctx.storage.setAlarm(at))
      }
    })
  }
}
