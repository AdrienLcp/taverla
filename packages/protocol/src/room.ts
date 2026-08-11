import { z } from 'zod'

import { DEFAULT_BLINDTEST_SETTINGS, gameSettingsSchema } from './game'
import {
  nicknameSchema,
  playerIdSchema,
  roomCodeSchema,
  roundIdSchema,
  serverTimeSchema
} from './identifiers'
import { hostQuestionSchema, questionPromptSchema } from './question'
import { awardSchema } from './scoring'
import { hostTrackSchema, trackIdentitySchema } from './track'

export const MAX_PLAYERS_PER_ROOM = 24

export const roomPhases = [
  'lobby',
  'countdown',
  'playing',
  'buzzed',
  'revealed',
  'finished'
] as const

export const roomPhaseSchema = z.enum(roomPhases)

export const answerModes = ['buzzer', 'choice', 'typed'] as const

/**
 * How a round is answered. One game, not three: the pool, the audio, the
 * countdown, the reveal and the scoreboard are identical, and what differs is
 * who acts, who decides, and what scores.
 *
 * `buzzer` is one player, the first, judged by the host. `choice` and `typed`
 * are everyone at once, decided by the server — exactly, then fuzzily — and
 * scored by speed on top of being right.
 */
export const answerModeSchema = z.enum(answerModes)

export const roomSettingsSchema = z.object({
  answerMode: answerModeSchema,
  /**
   * How long a reveal stays on screen before the next round starts itself, or
   * `null` when the host advances by hand. The wait is served by the server for
   * the same reason the countdown is: a background tab throttles its timers,
   * and the host's screen is exactly the tab most likely to lose focus.
   */
  autoAdvanceMs: z.number().int().min(2_000).max(30_000).nullable(),
  /** Milliseconds between "start" and the first note, so every device lands together. */
  countdownMs: z.number().int().min(0).max(10_000),
  /**
   * Which game the room is playing, and the settings only that game has. The
   * room keeps what every game needs and hands the rest here — see `game.ts`.
   */
  game: gameSettingsSchema,
  roundCount: z.number().int().min(1).max(50)
})

export type AnswerMode = z.infer<typeof answerModeSchema>
export type RoomSettings = z.infer<typeof roomSettingsSchema>

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  /**
   * Everyone plays every round, which is what a party wants: the buzzer gives
   * the floor to whoever is quickest and leaves the rest of the room watching.
   */
  answerMode: 'typed',
  autoAdvanceMs: null,
  countdownMs: 3_000,
  game: DEFAULT_BLINDTEST_SETTINGS,
  roundCount: 10
}

export const publicPlayerSchema = z.object({
  id: playerIdSchema,
  isConnected: z.boolean(),
  nickname: nicknameSchema,
  score: z.number().int().nonnegative()
})

export const activeBuzzSchema = z.object({
  /** Stamped by the server on frame arrival — the only ordering anyone can trust. */
  atServerTime: serverTimeSchema,
  playerId: playerIdSchema
})

/**
 * Who is in, and when they got there — never what they said. The room watching
 * a screen fill up with names is the tension of a simultaneous round, and it
 * costs nothing that could be worked backwards into the answer.
 */
export const roundAnswerSchema = z.object({
  atServerTime: serverTimeSchema,
  playerId: playerIdSchema
})

/**
 * What each player actually answered, published at the reveal and not a moment
 * before. `isCorrect` is the server's grade, which is only a leak once the
 * answer is already public.
 */
export const revealedAnswerSchema = roundAnswerSchema.extend({
  isCorrect: z.boolean(),
  /** The choice they picked, or the two fields they typed. */
  said: z.string()
})

/**
 * What the round is asking, in the vocabulary of the game asking it. Everything
 * around it — who buzzed, who is locked out, what was awarded — is the shell's
 * and is the same in every game.
 *
 * Both arms are safe for a player to hold: one of the choices is the answer,
 * which is the game rather than a leak. **Which** one lives only in the
 * server's `Round` and reaches no frame — see `codec.test.ts`.
 */
export const roundContentSchema = z.discriminatedUnion('kind', [
  z.object({
    /** Choice mode only, and shuffled per round. */
    choices: z.array(trackIdentitySchema),
    kind: z.literal('blindtest'),
    revealedTrack: trackIdentitySchema.nullable()
  }),
  z.object({
    /** Choice mode only, and shuffled per round. */
    choices: z.array(z.string()),
    kind: z.literal('quiz'),
    prompt: questionPromptSchema,
    revealedAnswer: z.string().nullable()
  })
])

export const roundViewSchema = z.object({
  activeBuzz: activeBuzzSchema.nullable(),
  /** Buzzer mode leaves this empty; the other two fill it as frames arrive. */
  answers: z.array(roundAnswerSchema),
  /** Points already granted this round, in the order the host granted them. */
  awards: z.array(awardSchema),
  content: roundContentSchema,
  id: roundIdSchema,
  /** 1-based, so it reads as "round 3 of 10" without arithmetic at the call site. */
  index: z.number().int().positive(),
  /** Answered wrong this round — cannot buzz again until the next one. */
  lockedOutPlayerIds: z.array(playerIdSchema),
  /** Empty until the reveal, then what everyone said and whether it was right. */
  revealedAnswers: z.array(revealedAnswerSchema),
  /**
   * Server time the round opens on — the first note, or the question appearing.
   * Every client schedules against its own clock offset, which is what lands the
   * countdown on every device together.
   */
  startsAt: serverTimeSchema.nullable()
})

const baseRoomViewSchema = z.object({
  code: roomCodeSchema,
  /**
   * The host's browser is the room's speaker and its only judge, so its absence
   * is a fact the whole room needs rather than a detail of the connection. The
   * server freezes the round while this is `false`.
   */
  isHostConnected: z.boolean(),
  phase: roomPhaseSchema,
  players: z.array(publicPlayerSchema),
  round: roundViewSchema.nullable(),
  settings: roomSettingsSchema
})

/**
 * The round as the one screen judging it sees it — the half no player may hold.
 * Both arms go `null` while the host holds a seat: that screen is a player's
 * then, and a payload it could read in a console is not a guarantee.
 */
export const hostRoundContentSchema = z.discriminatedUnion('kind', [
  z.object({
    /**
     * What the speaker needs, which is not what the judge needs. A seated host
     * keeps this and loses `track`, so their own screen cannot hand them the
     * answer while it still plays the clip.
     *
     * The URL carries the catalogue's track id, which a console could resolve —
     * the same residual trade a remote mode would make, and the reason the seat
     * is offered rather than assumed.
     */
    audioUrl: z.url().nullable(),
    kind: z.literal('blindtest'),
    track: hostTrackSchema.nullable()
  }),
  z.object({
    kind: z.literal('quiz'),
    question: hostQuestionSchema.nullable()
  })
])

/**
 * Adds everything a player must not see: the answer to the round in play, and
 * how much of the catalogue is left.
 */
export const hostRoomViewSchema = baseRoomViewSchema.extend({
  currentContent: hostRoundContentSchema.nullable(),
  remainingPoolSize: z.number().int().nonnegative(),
  /**
   * Round time already consumed, buzz pauses excluded. It is what lets a host
   * who reloaded mid-round seek back to where the room actually is, rather than
   * restarting the track under everyone.
   */
  roundElapsedMs: z.number().int().nonnegative()
})

export const playerRoomViewSchema = baseRoomViewSchema.extend({
  youId: playerIdSchema
})

export type RoomPhase = z.infer<typeof roomPhaseSchema>
export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type ActiveBuzz = z.infer<typeof activeBuzzSchema>
export type RoundContent = z.infer<typeof roundContentSchema>
export type HostRoundContent = z.infer<typeof hostRoundContentSchema>
export type RoundView = z.infer<typeof roundViewSchema>
export type HostRoomView = z.infer<typeof hostRoomViewSchema>
export type PlayerRoomView = z.infer<typeof playerRoomViewSchema>
