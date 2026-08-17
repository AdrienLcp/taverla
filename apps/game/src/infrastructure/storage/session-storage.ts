import { z } from 'zod'

import { connectionRoleSchema } from '@taverla/protocol/client-message'
import {
  type HostToken,
  hostTokenSchema,
  type Nickname,
  nicknameSchema,
  type RoomCode,
  roomCodeSchema,
  type SessionId,
  sessionIdSchema
} from '@taverla/protocol/identifiers'

import {
  forgetSeat,
  hostTokenFor,
  hostTokensWithout,
  type RememberedHostToken,
  type RememberedSeat,
  rememberedSeatFor,
  rememberHostToken,
  rememberSeat,
  type SeatScope
} from '@taverla/core/room/session-memory'

const SEATS_KEY = 'taverla:seats'
const HOST_TOKENS_KEY = 'taverla:host-tokens'
const ONE_KEY_EACH_PREFIX = 'taverla:session:'

/**
 * `nickname` defaults rather than being required, because this store predates
 * it: a blob written by the previous build has no such field, and a required one
 * would fail the whole array and cost every device its seats on the deploy that
 * added it.
 */
const rememberedSeatsSchema = z.array(
  z.object({
    at: z.number(),
    nickname: nicknameSchema.nullable().default(null),
    role: connectionRoleSchema,
    roomCode: roomCodeSchema,
    sessionId: sessionIdSchema
  })
)

const rememberedHostTokensSchema = z.array(
  z.object({
    at: z.number(),
    hostToken: hostTokenSchema,
    roomCode: roomCodeSchema
  })
)

/**
 * The session id is minted by the client, not the server, and that is
 * load-bearing rather than stylistic: React's StrictMode opens a socket, tears
 * it down and opens another, and the server can still be holding the first when
 * the second says hello. A client-supplied id makes the second connection a
 * *reclaim* of the same seat instead of a stranger fighting for it — the same
 * path a phone takes when it reconnects after a screen lock.
 *
 * Every claim is re-stamped on the way through, minted or not, because this runs
 * when a socket opens: that is the only moment the device can say which of the
 * seats it remembers is still worth keeping.
 *
 * Every access is guarded: `localStorage` throws outright in a Safari private
 * window. The degradation is losing the ability to reclaim a seat, which beats
 * a blank page.
 */
export const ensureSessionId = (scope: SeatScope): SessionId => {
  const seats = readSeats()
  const remembered = rememberedSeatFor({ ...scope, seats })
  const sessionId = remembered?.sessionId ?? mintSessionId()

  writeSeats(
    rememberSeat({
      ...scope,
      at: Date.now(),
      nickname: remembered?.nickname ?? null,
      seats,
      sessionId
    })
  )

  return sessionId
}

/**
 * The name this screen holds a seat under in this room, and `null` when it holds
 * none. The console is what needs it: a host takes a seat by putting a nickname
 * on the `hello`, so a tab discarded on a screen lock — routine on Android, and
 * a reload rather than a socket blink — used to come back saying nothing and be
 * seated nowhere, with no way to ask again until the game ended.
 */
export const readSeatNickname = (scope: SeatScope): Nickname | null =>
  rememberedSeatFor({ ...scope, seats: readSeats() })?.nickname ?? null

/**
 * Parsed here rather than trusted, because the whole store is read through one
 * schema: a name the contract refuses would fail the array on the next read and
 * take every other seat down with it.
 */
export const writeSeatNickname = ({
  nickname,
  ...scope
}: SeatScope & { nickname: string }): void => {
  const parsed = nicknameSchema.safeParse(nickname)

  if (!parsed.success) {
    return
  }

  keepSeatNickname(scope, parsed.data)
}

/** Called when the seat is given up on purpose; the room is still this screen's. */
export const forgetSeatNickname = (scope: SeatScope): void => {
  keepSeatNickname(scope, null)
}

const keepSeatNickname = (
  scope: SeatScope,
  nickname: Nickname | null
): void => {
  const seats = readSeats()

  writeSeats(
    rememberSeat({
      ...scope,
      at: Date.now(),
      nickname,
      seats,
      sessionId:
        rememberedSeatFor({ ...scope, seats })?.sessionId ?? mintSessionId()
    })
  )
}

/**
 * Written the moment a room is created, before any socket opens, and again when
 * somebody types the token onto a second screen.
 *
 * A key of its own rather than a field on the host seat: a console displaced
 * from its own room is refused with a code that voids the seat, and a token
 * dropped along with it would leave the room's owner unable to take it back —
 * which is the whole of what a token is for.
 */
export const writeHostToken = ({
  hostToken,
  roomCode
}: {
  hostToken: HostToken
  roomCode: RoomCode
}): void => {
  writeHostTokens(
    rememberHostToken({
      at: Date.now(),
      hostToken,
      roomCode,
      tokens: readHostTokens()
    })
  )
}

export const readHostToken = (roomCode: RoomCode): HostToken | null =>
  hostTokenFor({ roomCode, tokens: readHostTokens() })

/** Called when the room is disbanded: the code stops resolving, so this opens nothing. */
export const forgetHostToken = (roomCode: RoomCode): void => {
  writeHostTokens(hostTokensWithout({ roomCode, tokens: readHostTokens() }))
}

/**
 * `crypto.randomUUID` exists only in a secure context, and the obvious way to
 * try this on real phones — plain HTTP on a LAN address — is not one. There it
 * is `undefined`, and calling it would throw before anyone could take a seat.
 *
 * The fallback is not cryptographically strong and does not need to be: a
 * session id claims a seat in a room whose code is being read aloud in the same
 * living room.
 */
const mintSessionId = (): SessionId =>
  crypto.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

/**
 * Called when a player gives their seat up on purpose, or when a host disbands
 * the room they were running. Keeping the claim would not break anything — the
 * server no longer knows it, so a return would be a new arrival either way — but
 * a claim on a seat that has been handed back is a lie this device would
 * otherwise carry until it aged out.
 */
export const forgetSessionId = (scope: SeatScope): void => {
  writeSeats(forgetSeat({ ...scope, seats: readSeats() }))
}

/**
 * A seat used to be a `localStorage` key of its own, and nothing ever removed
 * one — a browser that had played thirty rooms held thirty keys, all but the
 * last naming a code that stopped resolving the same evening.
 *
 * They are dropped rather than carried over, and that costs a device upgrading
 * mid-round its seat: they are undated, so the eight worth keeping cannot be
 * told from the seventy that are not.
 */
const dropSeatsKeptOneKeyEach = (): void => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(ONE_KEY_EACH_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    return
  }
}

const readSeats = (): RememberedSeat[] => {
  const stored = read(SEATS_KEY)

  if (stored === null) {
    dropSeatsKeptOneKeyEach()

    return []
  }

  const parsed = rememberedSeatsSchema.safeParse(parseJson(stored))

  return parsed.success ? parsed.data : []
}

const writeSeats = (seats: RememberedSeat[]): void => {
  write(SEATS_KEY, JSON.stringify(seats))
}

const readHostTokens = (): RememberedHostToken[] => {
  const parsed = rememberedHostTokensSchema.safeParse(
    parseJson(read(HOST_TOKENS_KEY) ?? '')
  )

  return parsed.success ? parsed.data : []
}

const writeHostTokens = (tokens: RememberedHostToken[]): void => {
  write(HOST_TOKENS_KEY, JSON.stringify(tokens))
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}
