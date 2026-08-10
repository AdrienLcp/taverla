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

export const roomSettingsSchema = z.object({
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

export type RoomSettings = z.infer<typeof roomSettingsSchema>

/**
 * A Deezer preview is 30 seconds, so `playbackDurationMs` cannot exceed it —
 * the schema's ceiling is that hard limit, not a taste call.
 */
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  autoAdvanceMs: null,
  countdownMs: 3_000,
  difficulty: 'wellKnown',
  playbackDurationMs: 30_000,
  roundCount: 10,
  source: { genreId: 0, kind: 'chart' }
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

export const roundViewSchema = z.object({
  activeBuzz: activeBuzzSchema.nullable(),
  /** Server time the clip should start; every client schedules against its own clock offset. */
  audioStartsAt: serverTimeSchema.nullable(),
  /** Points already granted this round, in the order the host granted them. */
  awards: z.array(awardSchema),
  id: roundIdSchema,
  /** 1-based, so it reads as "round 3 of 10" without arithmetic at the call site. */
  index: z.number().int().positive(),
  /** Answered wrong this round — cannot buzz again until the next one. */
  lockedOutPlayerIds: z.array(playerIdSchema),
  revealedTrack: trackIdentitySchema.nullable()
})

const baseRoomViewSchema = z.object({
  code: roomCodeSchema,
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
