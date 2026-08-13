import { z } from 'zod'

import { connectionRoleSchema } from '@taverla/protocol/client-message'
import {
  roomCodeSchema,
  type SessionId,
  sessionIdSchema
} from '@taverla/protocol/identifiers'

import {
  forgetSeat,
  type RememberedSeat,
  rememberedSeatFor,
  rememberSeat,
  type SeatScope
} from '@taverla/core/room/session-memory'

const SEATS_KEY = 'taverla:seats'
const ONE_KEY_EACH_PREFIX = 'taverla:session:'

const rememberedSeatsSchema = z.array(
  z.object({
    at: z.number(),
    role: connectionRoleSchema,
    roomCode: roomCodeSchema,
    sessionId: sessionIdSchema
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
  const sessionId = rememberedSeatFor({ ...scope, seats }) ?? mintSessionId()

  writeSeats(rememberSeat({ ...scope, at: Date.now(), seats, sessionId }))

  return sessionId
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
