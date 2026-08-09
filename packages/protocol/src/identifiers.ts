import { z } from 'zod'

export const ROOM_CODE_LENGTH = 4

/**
 * Room codes are read aloud and typed on a phone keypad, so the alphabet drops
 * every glyph pair a human confuses under stress: `I`/`1`, `O`/`0`, `S`/`5`,
 * `Z`/`2`. Generation lives in `@taverla/core/room/room-code`; this is only
 * the shape the wire accepts.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY346789'

export const roomCodeSchema = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`))

export const playerIdSchema = z.string().min(1).max(64)
export const roundIdSchema = z.string().min(1).max(64)

/**
 * Held in the phone's `localStorage` and replayed in `hello`. It is what lets a
 * player who locks their screen, loses signal or reloads come back to the same
 * seat with the same score instead of joining as a stranger.
 */
export const sessionIdSchema = z.string().min(1).max(64)

export const nicknameSchema = z.string().trim().min(1).max(20)

/** Server clock, milliseconds since the epoch. Never a client-supplied value. */
export const serverTimeSchema = z.number().int().nonnegative()

export type RoomCode = z.infer<typeof roomCodeSchema>
export type PlayerId = z.infer<typeof playerIdSchema>
export type RoundId = z.infer<typeof roundIdSchema>
export type SessionId = z.infer<typeof sessionIdSchema>
export type Nickname = z.infer<typeof nicknameSchema>
export type ServerTime = z.infer<typeof serverTimeSchema>
