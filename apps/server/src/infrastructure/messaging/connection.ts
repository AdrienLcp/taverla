import type { PlayerId, SessionId } from '@taverla/protocol/identifiers'

/**
 * Anything that can be written to. Kept separate from `Connection` so a socket
 * that has not introduced itself yet — and therefore has no role and no seat —
 * can still be sent an error.
 */
export type Outbound = {
  send: (payload: string) => void
}

/**
 * The role decides which view this socket is sent; the seat decides whether it
 * may answer. They are separate because a host running the room from the one
 * phone in it can hold both — `playerId` is `null` for a host who is only
 * running the game, and a real id for one who is also playing.
 *
 * A player is never seatless, which is what lets the broadcaster build a player
 * view without inventing a fallback id.
 */
export type Connection = Outbound &
  (
    | { playerId: PlayerId | null; role: 'host' }
    | { playerId: PlayerId; role: 'player' }
  ) & {
    sessionId: SessionId
  }
