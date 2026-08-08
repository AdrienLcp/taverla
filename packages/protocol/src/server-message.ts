import { z } from 'zod'

import { protocolErrorCodeSchema } from './error-code'
import { serverTimeSchema, sessionIdSchema } from './identifiers'
import { hostRoomViewSchema, playerRoomViewSchema } from './room'

/**
 * Mirrors `time.ping` back with the server's own clock reading. The client
 * needs its original send time to compute the round trip, and echoing it keeps
 * the server stateless across the handshake.
 */
export const timePongMessageSchema = z.object({
  clientSentAt: z.number().int().nonnegative(),
  serverTime: serverTimeSchema,
  type: z.literal('time.pong')
})

export const protocolErrorMessageSchema = z.object({
  code: protocolErrorCodeSchema,
  /** The socket is being closed after this frame; reconnecting will not help. */
  fatal: z.boolean(),
  message: z.string(),
  type: z.literal('error')
})

const welcomeFields = {
  protocolVersion: z.number().int().positive(),
  serverTime: serverTimeSchema,
  /** Persist it: replaying it in `hello` is what reclaims this seat after a reload. */
  sessionId: sessionIdSchema,
  type: z.literal('welcome')
}

export const hostWelcomeMessageSchema = z.object({
  ...welcomeFields,
  view: hostRoomViewSchema
})

export const playerWelcomeMessageSchema = z.object({
  ...welcomeFields,
  view: playerRoomViewSchema
})

/**
 * The only broadcast in the protocol: after any state change the server sends
 * each socket its whole role-scoped view. A room holds at most
 * `MAX_PLAYERS_PER_ROOM` players and changes at human speed, so the snapshot
 * costs a few hundred bytes and removes every way for a client to hold a
 * partially-applied delta — see `docs/realtime-protocol.md`.
 */
export const hostRoomUpdatedMessageSchema = z.object({
  type: z.literal('room.updated'),
  view: hostRoomViewSchema
})

export const playerRoomUpdatedMessageSchema = z.object({
  type: z.literal('room.updated'),
  view: playerRoomViewSchema
})

/**
 * Split by role so that handing a player the answer is a compile error rather
 * than a review comment: only the host variants reference `hostRoomViewSchema`,
 * the one place `HostTrack` — title, artist, audio — reaches the wire before a
 * reveal.
 */
export const hostServerMessageSchema = z.discriminatedUnion('type', [
  hostWelcomeMessageSchema,
  hostRoomUpdatedMessageSchema,
  timePongMessageSchema,
  protocolErrorMessageSchema
])

export const playerServerMessageSchema = z.discriminatedUnion('type', [
  playerWelcomeMessageSchema,
  playerRoomUpdatedMessageSchema,
  timePongMessageSchema,
  protocolErrorMessageSchema
])

export type ProtocolErrorMessage = z.infer<typeof protocolErrorMessageSchema>
export type HostServerMessage = z.infer<typeof hostServerMessageSchema>
export type PlayerServerMessage = z.infer<typeof playerServerMessageSchema>
export type ServerMessage = HostServerMessage | PlayerServerMessage
