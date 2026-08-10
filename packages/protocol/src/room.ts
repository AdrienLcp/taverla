import { z } from 'zod'

import {
  nicknameSchema,
  playerIdSchema,
  roomCodeSchema,
  roundIdSchema,
  serverTimeSchema
} from './identifiers'
import { awardSchema } from './scoring'
import {
  hostTrackSchema,
  trackDifficultySchema,
  trackIdentitySchema,
  trackSourceSchema
} from './track'

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
  difficulty: trackDifficultySchema,
  /** How long a clip runs unanswered before the round times out. */
  playbackDurationMs: z.number().int().min(5_000).max(30_000),
  roundCount: z.number().int().min(1).max(50),
  source: trackSourceSchema
})

export type AnswerMode = z.infer<typeof answerModeSchema>
export type RoomSettings = z.infer<typeof roomSettingsSchema>

/**
 * A Deezer preview is 30 seconds, so `playbackDurationMs` cannot exceed it —
 * the schema's ceiling is that hard limit, not a taste call.
 */
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  /**
   * Everyone plays every round, which is what a party wants: the buzzer gives
   * the floor to whoever is quickest and leaves the rest of the room watching.
   */
  answerMode: 'typed',
  autoAdvanceMs: null,
  countdownMs: 3_000,
  difficulty: 'wellKnown',
  playbackDurationMs: 30_000,
  roundCount: 10,
  source: { genreIds: [], kind: 'chart' }
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

export const roundViewSchema = z.object({
  activeBuzz: activeBuzzSchema.nullable(),
  /** Buzzer mode leaves this empty; the other two fill it as frames arrive. */
  answers: z.array(roundAnswerSchema),
  /** Server time the clip should start; every client schedules against its own clock offset. */
  audioStartsAt: serverTimeSchema.nullable(),
  /** Points already granted this round, in the order the host granted them. */
  awards: z.array(awardSchema),
  /**
   * Choice mode only, and shuffled per round. One of them is the answer, which
   * is the game rather than a leak — **which** one lives only in the server's
   * `Round` and reaches no frame. See `codec.test.ts`.
   */
  choices: z.array(trackIdentitySchema),
  id: roundIdSchema,
  /** 1-based, so it reads as "round 3 of 10" without arithmetic at the call site. */
  index: z.number().int().positive(),
  /** Answered wrong this round — cannot buzz again until the next one. */
  lockedOutPlayerIds: z.array(playerIdSchema),
  /** Empty until the reveal, then what everyone said and whether it was right. */
  revealedAnswers: z.array(revealedAnswerSchema),
  revealedTrack: trackIdentitySchema.nullable()
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
 * Adds everything a player must not see: the track currently playing, and how
 * many are left in the pool.
 */
export const hostRoomViewSchema = baseRoomViewSchema.extend({
  /**
   * What the speaker needs, which is not what the judge needs. A host who is
   * also playing gets this and not `currentTrack`, so their own screen cannot
   * hand them the answer.
   *
   * The URL still carries the catalogue's track id, which a console could
   * resolve — the same residual trade a remote mode would make, and the reason
   * the seat is offered rather than assumed.
   */
  currentAudioUrl: z.url().nullable(),
  /** `null` while the host holds a seat: a player must not read the answer. */
  currentTrack: hostTrackSchema.nullable(),
  /**
   * Clip time already consumed, buzz pauses excluded. It is what lets a host who
   * reloaded mid-round seek back to where the room actually is, rather than
   * restarting the track under everyone.
   */
  playbackElapsedMs: z.number().int().nonnegative(),
  remainingPoolSize: z.number().int().nonnegative()
})

export const playerRoomViewSchema = baseRoomViewSchema.extend({
  youId: playerIdSchema
})

export type RoomPhase = z.infer<typeof roomPhaseSchema>
export type PublicPlayer = z.infer<typeof publicPlayerSchema>
export type ActiveBuzz = z.infer<typeof activeBuzzSchema>
export type RoundView = z.infer<typeof roundViewSchema>
export type HostRoomView = z.infer<typeof hostRoomViewSchema>
export type PlayerRoomView = z.infer<typeof playerRoomViewSchema>
