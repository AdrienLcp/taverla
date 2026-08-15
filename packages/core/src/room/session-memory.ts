import type { ConnectionRole } from '@taverla/protocol/client-message'
import type { ProtocolErrorCode } from '@taverla/protocol/error-code'
import type { RoomCode, SessionId } from '@taverla/protocol/identifiers'

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
 */
export type RememberedSeat = {
  at: number
  role: ConnectionRole
  roomCode: RoomCode
  sessionId: SessionId
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
 * The refusals that mean the seat was never granted. A claim is written before
 * the `hello` it is sent in, so a browser turned away at the door holds one it
 * never had — at the head of a bounded store, where it evicts a real seat rather
 * than waiting to age out.
 *
 * The two other fatal codes are absent on purpose: a version mismatch and a
 * malformed frame refuse the *frame*, and the seat behind them is usually good.
 * A deploy mid-party would otherwise cost every device its place.
 */
const REFUSALS_VOIDING_A_SEAT = new Set<ProtocolErrorCode>([
  'host_already_connected',
  'room_not_found'
])

export const refusalVoidsSeat = (code: ProtocolErrorCode): boolean =>
  REFUSALS_VOIDING_A_SEAT.has(code)

export const rememberedSeatFor = ({
  role,
  roomCode,
  seats
}: SeatScope & { seats: RememberedSeat[] }): SessionId | null =>
  seats.find((seat) => seat.role === role && seat.roomCode === roomCode)
    ?.sessionId ?? null

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
  role,
  roomCode,
  seats,
  sessionId
}: RememberedSeat & { seats: RememberedSeat[] }): RememberedSeat[] =>
  [{ at, role, roomCode, sessionId }, ...forgetSeat({ role, roomCode, seats })]
    .filter((seat) => seat.at > at - SEAT_MEMORY_MS)
    .slice(0, MAX_REMEMBERED_SEATS)
