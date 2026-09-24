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
import { singleVerdictSchema, verdictSchema } from './scoring'
import {
  MAX_SLATE_ITEMS,
  slateAnswerSchema,
  slateItemIndexSchema,
  slateKeySchema
} from './slate'

/**
 * `wall` is the room's own screen: it shows the game to everyone and holds no
 * secret, no control and no seat. A role of its own rather than a flag on the
 * host, so every check written for *the* host — who is present, who may send a
 * `host.*` frame, who a token claim displaces — already leaves it out.
 */
export const connectionRoles = ['host', 'player', 'wall'] as const
export const connectionRoleSchema = z.enum(connectionRoles)

/**
 * The first frame on every socket. `sessionId` is replayed from storage so a
 * reconnect reclaims the same seat and score; its absence means a new arrival.
 * A player must name themselves, a host must not.
 *
 * `hostToken` is the room's own secret, replayed the same way and read by the
 * server on a host claim — it is what takes the room back from a screen that
 * took it over — and on a wall, which is refused without it because it carries
 * the clip. A player frame carrying one is answering a question nobody asked.
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
 * device that locks its screen closes one too, and that seat has to survive.
 * Leaving is therefore something a player *says*, and it is what makes the
 * roster on the console true rather than eventually true.
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

/**
 * One line of the slate, saved on its own as it is written — an upsert, and an
 * empty `answer` takes the line back. One line per frame rather than the whole
 * sheet, so two screens of one player cannot overwrite each other's other
 * lines, and a frame lost to a blink costs one answer rather than all of them.
 *
 * In the game's namespace for Le Fake's reason: nothing else on the shelf
 * writes a sheet.
 */
export const writeSlateLineMessageSchema = z.object({
  answer: slateAnswerSchema,
  itemIndex: slateItemIndexSchema,
  roundId: roundIdSchema,
  type: z.literal('slate.write')
})

export const updateSettingsMessageSchema = z.object({
  settings: roomSettingsSchema,
  type: z.literal('host.updateSettings')
})

/**
 * `slateKeys` is the answer key a host typed before the evening, kept on their
 * own machine because the settings reach every player. It rides the press that
 * opens the sheet, so the round never exists without it and a console that
 * reloads mid-game has nothing to send again. Ignored by every other game.
 */
export const startRoundMessageSchema = z.object({
  slateKeys: z.array(slateKeySchema.nullable()).max(MAX_SLATE_ITEMS).optional(),
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
 * has no such clock, and a table where the three quickest players have already
 * missed is a round nobody can win.
 */
export const clearLockoutsMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('host.clearLockouts')
})

/**
 * One more thing to guess on the slate, while the sheets are open. A host who
 * brings the cups one at a time opens on one item and adds as they go.
 */
export const addItemMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('host.addItem')
})

/** The host's memo for one item; empty clears it. It reaches no player frame, ever. */
export const setItemKeyMessageSchema = z.object({
  itemIndex: slateItemIndexSchema,
  key: slateKeySchema,
  roundId: roundIdSchema,
  type: z.literal('host.setItemKey')
})

/**
 * The host's key for one closed item goes up big on the wall and onto every
 * sheet. Only a closed item: nobody can still write an answer it would give
 * away.
 */
export const revealItemKeyMessageSchema = z.object({
  itemIndex: slateItemIndexSchema,
  roundId: roundIdSchema,
  type: z.literal('host.revealItemKey')
})

/**
 * One item of the slate goes read-only on every sheet and onto the wall, while
 * every other item stays open for writing — the host marks what the room has
 * finished with, not the whole sheet at once.
 */
export const closeItemMessageSchema = z.object({
  itemIndex: slateItemIndexSchema,
  roundId: roundIdSchema,
  type: z.literal('host.closeItem')
})

/** Every item still open closes at once, and the wall moves to the first of them. */
export const collectSheetsMessageSchema = z.object({
  roundId: roundIdSchema,
  type: z.literal('host.collectSheets')
})

/** Moves the wall to one closed item — forward, or back to change a verdict already given. */
export const showItemMessageSchema = z.object({
  itemIndex: slateItemIndexSchema,
  roundId: roundIdSchema,
  type: z.literal('host.showItem')
})

/**
 * A verdict over every player who wrote the same thing on the item on the wall.
 * Its own frame rather than `host.judge`, which names one player on the floor
 * and ends in a lockout or a reveal: this names a group, pays or unpays it on
 * the spot, and can be taken back. `itemIndex` guards a late tap the way
 * `roundId` does — it must be the item on the wall.
 */
export const judgeGroupMessageSchema = z.object({
  groupKey: z.string().min(1),
  itemIndex: slateItemIndexSchema,
  roundId: roundIdSchema,
  type: z.literal('host.judgeGroup'),
  verdict: singleVerdictSchema
})

export const nextRoundMessageSchema = z.object({
  type: z.literal('host.nextRound')
})

export const endGameMessageSchema = z.object({
  type: z.literal('host.endGame')
})

/**
 * Back to the lobby with the same players in the same seats and the scores at
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
 * deliberately is not. Irreversible: the code stops resolving, so the players
 * who scanned it cannot come back to it even by reloading.
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
  addItemMessageSchema,
  setItemKeyMessageSchema,
  revealItemKeyMessageSchema,
  closeItemMessageSchema,
  collectSheetsMessageSchema,
  showItemMessageSchema,
  judgeGroupMessageSchema,
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
  voteMessageSchema,
  writeSlateLineMessageSchema
])

/** A wall says who it is and keeps its clock, and nothing else. */
export const wallClientMessageSchema = z.discriminatedUnion('type', [
  helloMessageSchema,
  timePingMessageSchema
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
  writeSlateLineMessageSchema,
  updateSettingsMessageSchema,
  startRoundMessageSchema,
  judgeMessageSchema,
  revealMessageSchema,
  clearLockoutsMessageSchema,
  addItemMessageSchema,
  setItemKeyMessageSchema,
  revealItemKeyMessageSchema,
  closeItemMessageSchema,
  collectSheetsMessageSchema,
  showItemMessageSchema,
  judgeGroupMessageSchema,
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
export type WallClientMessage = z.infer<typeof wallClientMessageSchema>
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
  'host.addItem',
  'host.setItemKey',
  'host.revealItemKey',
  'host.closeItem',
  'host.collectSheets',
  'host.showItem',
  'host.judgeGroup',
  'host.nextRound',
  'host.endGame',
  'host.playAgain',
  'host.removePlayer',
  'host.closeRoom'
])

/**
 * The frames that move a round along from the floor, partitioned out for the
 * one gate that has to refuse all four at once: a room whose console is gone is
 * frozen, and a freeze the floor can still fill in is not one. The seat frames
 * — `player.leave`, `player.rename` — are deliberately not here, because
 * leaving a room nobody is running is exactly what a player should still be
 * allowed to do.
 *
 * `slate.write` is not here either: a line on a sheet moves nothing along —
 * only the host closes an item — and refusing a save over a console's Wi-Fi blink
 * would lose an answer the player believes is kept.
 */
export const FLOOR_MESSAGE_TYPES = new Set<ClientMessageType>([
  'player.buzz',
  'player.answer',
  'lefake.submit',
  'lefake.vote'
])
