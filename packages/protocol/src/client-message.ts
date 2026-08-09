import { z } from 'zod'

import {
  nicknameSchema,
  playerIdSchema,
  roundIdSchema,
  sessionIdSchema
} from './identifiers'
import { roomSettingsSchema } from './room'
import { verdictSchema } from './scoring'

export const connectionRoles = ['host', 'player'] as const
export const connectionRoleSchema = z.enum(connectionRoles)

/**
 * The first frame on every socket. `sessionId` is replayed from storage so a
 * reconnect reclaims the same seat and score; its absence means a new arrival.
 * A player must name themselves, a host must not.
 */
export const helloMessageSchema = z.object({
  nickname: nicknameSchema.optional(),
  protocolVersion: z.number().int().positive(),
  role: connectionRoleSchema,
  sessionId: sessionIdSchema.optional(),
  type: z.literal('hello')
})

/**
 * Half of the clock handshake. The client echoes its own send time back so it
 * can measure the round trip without the server having to remember anything —
 * see `@blindtest/core/time/clock-sync` for the estimator that consumes it.
 */
export const timePingMessageSchema = z.object({
  clientSentAt: z.number().int().nonnegative(),
  type: z.literal('time.ping')
})

/**
 * Carries no timestamp on purpose. Ordering is decided by when the frame
 * reaches the server, because anything the client says about "when" is both
 * clock-skewed and trivially forged.
 */
export const buzzMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('player.buzz')
})

export const updateSettingsMessageSchema = z.object({
  settings: roomSettingsSchema,
  type: z.literal('host.updateSettings')
})

export const startRoundMessageSchema = z.object({
  type: z.literal('host.startRound')
})

/** Judging is the host's call; `roundId` guards against a late click on a round that already moved on. */
export const judgeMessageSchema = z.object({
  playerId: playerIdSchema,
  roundId: roundIdSchema,
  type: z.literal('host.judge'),
  verdict: verdictSchema
})

export const revealMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('host.reveal')
})

export const nextRoundMessageSchema = z.object({
  type: z.literal('host.nextRound')
})

export const endGameMessageSchema = z.object({
  type: z.literal('host.endGame')
})

/**
 * Back to the lobby with the same phones in the same seats and the scores at
 * zero. Distinct from `host.endGame` because keeping the room is the entire
 * point: making everyone re-scan is what ends an evening after one game.
 */
export const playAgainMessageSchema = z.object({
  type: z.literal('host.playAgain')
})

export const removePlayerMessageSchema = z.object({
  playerId: playerIdSchema,
  type: z.literal('host.removePlayer')
})

/**
 * What a host socket may send. Splitting the union by role means a player
 * screen cannot even construct `host.judge` — the server still enforces it,
 * because a socket is whatever its owner makes it, but the client code gets the
 * rule for free.
 */
export const hostClientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema,
  updateSettingsMessageSchema,
  startRoundMessageSchema,
  judgeMessageSchema,
  revealMessageSchema,
  nextRoundMessageSchema,
  endGameMessageSchema,
  playAgainMessageSchema,
  removePlayerMessageSchema
])

export const playerClientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema,
  buzzMessageSchema
])

/** Everything the server's decoder accepts, before it knows which role sent it. */
export const clientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema,
  buzzMessageSchema,
  updateSettingsMessageSchema,
  startRoundMessageSchema,
  judgeMessageSchema,
  revealMessageSchema,
  nextRoundMessageSchema,
  endGameMessageSchema,
  playAgainMessageSchema,
  removePlayerMessageSchema
])

export type ConnectionRole = z.infer<typeof connectionRoleSchema>
export type HelloMessage = z.infer<typeof helloMessageSchema>
export type HostClientMessage = z.infer<typeof hostClientMessageSchema>
export type PlayerClientMessage = z.infer<typeof playerClientMessageSchema>
export type ClientMessage = z.infer<typeof clientMessageSchema>
export type ClientMessageType = ClientMessage['type']

/**
 * Kept next to the union it partitions: the server checks this before acting,
 * since nothing stops a player's socket from sending a host frame by hand.
 */
export const HOST_ONLY_MESSAGE_TYPES = new Set<ClientMessageType>([
  'host.updateSettings',
  'host.startRound',
  'host.judge',
  'host.reveal',
  'host.nextRound',
  'host.endGame',
  'host.playAgain',
  'host.removePlayer'
])
