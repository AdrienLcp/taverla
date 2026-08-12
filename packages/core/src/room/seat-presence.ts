/**
 * A phone that locks its screen closes its socket, so "not connected" is not
 * the same claim as "gone" — and the two thresholds below are what separates
 * them. They nest: a seat is expected, then merely held, then released.
 */

/**
 * How long a dropped phone still holds the room up.
 *
 * The window exists for one race, and it is not hypothetical: the room advances
 * the moment everybody has acted, so a player whose Wi-Fi blinks in the second
 * their table-mate submits stops being counted, the phase closes on the nine
 * who remain, and they come back to a round they were never able to answer.
 *
 * Short, because the cost the other way is a room waiting on somebody who has
 * genuinely gone — but longer than the blink it is there to absorb.
 */
export const RECONNECT_GRACE_MS = 15_000

/**
 * How long a seat survives with nobody behind it. Past this the player is
 * removed outright rather than left greyed out: a *room* outlives a game and
 * chains several, so a phone that closed its browser in the first one would
 * otherwise sit on the scoreboard through every game after it.
 *
 * Deliberately the same ten minutes the server gives a room with nobody
 * connected at all (`ABANDONED_ROOM_GRACE_MS`), so the product tells one story
 * rather than two: nothing here survives ten minutes of nobody being behind it.
 * The two must move together.
 *
 * Long rather than short, because the two mistakes are not the same size — and
 * the size that decides it is how *visible* each one is at a party. Losing your
 * place is noticed and resented; a greyed row is barely noticed at all. The
 * seat-blocking argument for a shorter window is close to hypothetical: it needs
 * a twenty-fifth player arriving at a room whose ghosts have not yet cleared,
 * and the host can evict on the spot when it happens.
 *
 * Well clear of `RECONNECT_GRACE_MS`, because the two answer different
 * questions and a player who is merely slow to reconnect must never meet this
 * one.
 */
export const ABANDONED_SEAT_MS = 10 * 60 * 1_000

type Presence = {
  /** Server time the socket closed, and `null` while it is open. */
  disconnectedAt: number | null
  isConnected: boolean
}

/**
 * Whether the room should still wait for this player before closing a phase
 * everybody else has finished. A live socket always counts; a freshly dropped
 * one counts for as long as coming straight back is plausible.
 */
export const isStillExpected = (seat: Presence, now: number): boolean =>
  seat.isConnected ||
  (seat.disconnectedAt !== null &&
    now - seat.disconnectedAt < RECONNECT_GRACE_MS)

/** Whether the seat has been empty long enough to be given up entirely. */
export const isAbandoned = (seat: Presence, now: number): boolean =>
  !seat.isConnected &&
  seat.disconnectedAt !== null &&
  now - seat.disconnectedAt >= ABANDONED_SEAT_MS
