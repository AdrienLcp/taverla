import type { ConnectionRole } from '@taverla/protocol/client-message'
import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type {
  HostToken,
  Nickname,
  RoomCode,
  SessionId
} from '@taverla/protocol/identifiers'

/**
 * A seat is claimed per room *and* role: hosting and playing the same room from
 * one browser is a normal way to try the game out, and one claim covering both
 * would have the two tabs taking each other's identity.
 */
export type SeatScope = {
  role: ConnectionRole
  roomCode: RoomCode
}

/**
 * One seat this device holds a claim on. `at` is when it was last claimed rather
 * than when it was first minted, which is what keeps the room being played from
 * being the one a prune drops.
 *
 * `nickname` is the name this device holds *in this room and role*, and `null`
 * when it holds no seat at all. A console is the reason it lives here rather
 * than beside the device-global name a join form fills itself in from: a screen
 * running a room and playing in it takes its seat through the `hello`, so
 * nothing else carries the name across a reload — and the global one belongs to
 * whichever room this device joined last, which may not be this one.
 */
export type RememberedSeat = {
  at: number
  nickname: Nickname | null
  role: ConnectionRole
  roomCode: RoomCode
  sessionId: SessionId
}

/**
 * The room's own secret, kept in a store of its own rather than on the host
 * seat above — because the two do not die together. A console displaced from
 * its own room is told its *seat* was never granted, and dropping the token
 * with it would make that takeover final, which is the one thing the token
 * exists to prevent.
 */
export type RememberedHostToken = {
  at: number
  hostToken: HostToken
  roomCode: RoomCode
}

export const MAX_REMEMBERED_SEATS = 8

/**
 * The count bounds the store; the age is what keeps last week's party out of it,
 * and the two answer different questions — a device that plays one room a month
 * would never reach the count.
 *
 * A day rather than the ten minutes a room outlives its host, because a claim is
 * stamped when the socket opened: a phone that has sat locked since the first
 * round is exactly the one this exists for, and a party runs longer than a room's
 * own grace.
 */
export const SEAT_MEMORY_MS = 24 * 60 * 60 * 1_000

/**
 * The refusals that leave this device with a claim on nothing. Two shapes, and
 * they end the same way. A seat that was never granted: the claim is written
 * before the `hello` it is sent in, so a browser turned away at the door holds
 * one it never had — at the head of a bounded store, where it evicts a real seat
 * rather than waiting to age out. And a seat taken back, where the room is still
 * answering and a claim replayed on the next reload would be welcomed in.
 *
 * The two other fatal codes are absent on purpose: a version mismatch and a
 * malformed frame refuse the *frame*, and the seat behind them is usually good.
 * A deploy mid-party would otherwise cost every device its place.
 */
const REFUSALS_VOIDING_A_SEAT = new Set<ProtocolErrorCode>([
  'host_already_connected',
  'removed_by_host',
  'room_not_found'
])

export const refusalVoidsSeat = (code: ProtocolErrorCode): boolean =>
  REFUSALS_VOIDING_A_SEAT.has(code)

export const rememberedSeatFor = ({
  role,
  roomCode,
  seats
}: SeatScope & { seats: RememberedSeat[] }): RememberedSeat | null =>
  seats.find((seat) => seat.role === role && seat.roomCode === roomCode) ?? null

export const forgetSeat = ({
  role,
  roomCode,
  seats
}: SeatScope & { seats: RememberedSeat[] }): RememberedSeat[] =>
  seats.filter((seat) => seat.role !== role || seat.roomCode !== roomCode)

/**
 * The claim, at the head, with everything that no longer earns a place dropped
 * behind it. Pruning happens *here* rather than on the paths that end a room
 * because most claims die with nobody pressing anything: a room disbanded from
 * the console leaves every phone in it holding a code that has stopped
 * resolving, and no phone runs any code to find that out.
 *
 * Prepending rather than sorting is deliberate. A clock that steps backwards —
 * an NTP correction, a device whose date was wrong — would otherwise file the
 * claim just made below the ones it replaces, and drop the seat being taken.
 */
export const rememberSeat = ({
  at,
  nickname,
  role,
  roomCode,
  seats,
  sessionId
}: RememberedSeat & { seats: RememberedSeat[] }): RememberedSeat[] =>
  [
    { at, nickname, role, roomCode, sessionId },
    ...forgetSeat({ role, roomCode, seats })
  ]
    .filter((seat) => seat.at > at - SEAT_MEMORY_MS)
    .slice(0, MAX_REMEMBERED_SEATS)

export const hostTokenFor = ({
  roomCode,
  tokens
}: {
  roomCode: RoomCode
  tokens: RememberedHostToken[]
}): HostToken | null =>
  tokens.find((kept) => kept.roomCode === roomCode)?.hostToken ?? null

export const hostTokensWithout = ({
  roomCode,
  tokens
}: {
  roomCode: RoomCode
  tokens: RememberedHostToken[]
}): RememberedHostToken[] => tokens.filter((kept) => kept.roomCode !== roomCode)

/** Bounded and aged exactly as the seats are, and for the same two reasons. */
export const rememberHostToken = ({
  at,
  hostToken,
  roomCode,
  tokens
}: RememberedHostToken & {
  tokens: RememberedHostToken[]
}): RememberedHostToken[] =>
  [{ at, hostToken, roomCode }, ...hostTokensWithout({ roomCode, tokens })]
    .filter((kept) => kept.at > at - SEAT_MEMORY_MS)
    .slice(0, MAX_REMEMBERED_SEATS)
