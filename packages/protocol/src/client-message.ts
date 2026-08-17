import { z } from 'zod'

import {
  hostTokenSchema,
  nicknameSchema,
  playerIdSchema,
  roundIdSchema,
  sessionIdSchema
} from './identifiers'
import { lieSchema } from './lefake'
import { roomSettingsSchema } from './room'
import { verdictSchema } from './scoring'

export const connectionRoles = ['host', 'player'] as const
export const connectionRoleSchema = z.enum(connectionRoles)

/**
 * The first frame on every socket. `sessionId` is replayed from storage so a
 * reconnect reclaims the same seat and score; its absence means a new arrival.
 * A player must name themselves, a host must not.
 *
 * `hostToken` is the room's own secret, replayed the same way and read by the
 * server only on a host claim: it is what takes the room back from a screen that
 * took it over. A player frame carrying one is answering a question nobody asked.
 */
export const helloMessageSchema = z.object({
  hostToken: hostTokenSchema.optional(),
  nickname: nicknameSchema.optional(),
  protocolVersion: z.number().int().positive(),
  role: connectionRoleSchema,
  sessionId: sessionIdSchema.optional(),
  type: z.literal('hello')
})

/**
 * Half of the clock handshake. The client echoes its own send time back so it
 * can measure the round trip without the server having to remember anything —
 * see `@taverla/core/time/clock-sync` for the estimator that consumes it.
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

/**
 * Giving the seat up on purpose, which a closed socket cannot say on its own: a
 * phone that locks its screen closes one too, and that seat has to survive.
 * Leaving is therefore something a player *says*, and it is what makes the
 * roster on the big screen true rather than eventually true.
 */
export const leaveMessageSchema = z.object({
  type: z.literal('player.leave')
})

/**
 * Changing the name a seat is already held under. The `hello` renames a
 * returning session on its own, but reaching it means reopening the socket —
 * so a screen would drop the round it is in the middle of to edit a label.
 *
 * Named for the seat rather than the role, like `player.leave`: the console
 * that took one renames itself with the same frame.
 */
export const renameMessageSchema = z.object({
  nickname: nicknameSchema,
  type: z.literal('player.rename')
})

/**
 * The other two modes' answer, and it carries no timestamp for the same reason
 * `player.buzz` does not: the server stamps arrival, because the speed bonus is
 * decided by exactly that field and a client-supplied "when" is both
 * clock-skewed and trivially edited in a console.
 */
export const answerMessageSchema = z.object({
  answer: z.discriminatedUnion('kind', [
    z.object({
      /** An index into `round.choices`, which the server shuffled. */
      choiceIndex: z.number().int().nonnegative(),
      kind: z.literal('choice')
    }),
    z.object({
      /**
       * One claim, graded against the title and the artist independently —
       * whichever it matches is banked. Two fields asked a player to know which
       * half they were holding before they could say it, and a typed round is
       * won by firing the moment something surfaces.
       */
      guess: z.string().min(1).max(120),
      kind: z.literal('typed')
    })
  ]),
  roundId: roundIdSchema,
  type: z.literal('player.answer')
})

/**
 * A game's own namespace rather than `player.*`, because these two are the only
 * client frames on the shelf that no other game could receive: every other
 * message names something the shell does — buzz, answer, judge — where writing a
 * lie and voting on a board exist nowhere else.
 *
 * Neither carries a timestamp, and here that is not even about forgery: nothing
 * in this round is ranked by speed. Being quick to invent something is not the
 * game, and a bonus for voting first would pay a room for not reading the board.
 */
export const submitLieMessageSchema = z.object({
  lie: lieSchema,
  roundId: roundIdSchema,
  type: z.literal('lefake.submit')
})

/** `candidateId` rather than an index: the board is shuffled, and a vote must survive it. */
export const voteMessageSchema = z.object({
  candidateId: z.string().min(1),
  roundId: roundIdSchema,
  type: z.literal('lefake.vote')
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

/**
 * Everyone who was sat out is back in, mid-round. A blind test round is a clip
 * that runs out, so a lockout there expires on its own; a host running a charade
 * has no such clock, and a table where the three quickest thumbs have already
 * missed is a round nobody can win.
 */
export const clearLockoutsMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('host.clearLockouts')
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
 * The room is gone and everyone is out, which is the one exit `host.endGame`
 * deliberately is not. Irreversible: the code stops resolving, so the phones
 * that scanned it cannot come back to it even by reloading.
 */
export const closeRoomMessageSchema = z.object({
  type: z.literal('host.closeRoom')
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
  clearLockoutsMessageSchema,
  nextRoundMessageSchema,
  endGameMessageSchema,
  playAgainMessageSchema,
  removePlayerMessageSchema,
  closeRoomMessageSchema
])

export const playerClientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema,
  leaveMessageSchema,
  renameMessageSchema,
  buzzMessageSchema,
  answerMessageSchema,
  submitLieMessageSchema,
  voteMessageSchema
])

/** Everything the server's decoder accepts, before it knows which role sent it. */
export const clientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema,
  leaveMessageSchema,
  renameMessageSchema,
  buzzMessageSchema,
  answerMessageSchema,
  submitLieMessageSchema,
  voteMessageSchema,
  updateSettingsMessageSchema,
  startRoundMessageSchema,
  judgeMessageSchema,
  revealMessageSchema,
  clearLockoutsMessageSchema,
  nextRoundMessageSchema,
  endGameMessageSchema,
  playAgainMessageSchema,
  removePlayerMessageSchema,
  closeRoomMessageSchema
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
  'host.clearLockouts',
  'host.nextRound',
  'host.endGame',
  'host.playAgain',
  'host.removePlayer',
  'host.closeRoom'
])
