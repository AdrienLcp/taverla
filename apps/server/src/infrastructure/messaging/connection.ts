import type { PlayerId, SessionId } from '@blindtest/protocol/identifiers'

/**
 * Anything that can be written to. Kept separate from `Connection` so a socket
 * that has not introduced itself yet — and therefore has no role and no seat —
 * can still be sent an error.
 */
export type Outbound = {
  send: (payload: string) => void
}

/**
 * A union rather than a `playerId: PlayerId | null` field: the host holds no
 * seat, and narrowing on `role` is what lets the broadcaster build a player
 * view without inventing a fallback id for a player that always has one.
 */
export type Connection = Outbound &
  (
    | { playerId: null; role: 'host' }
    | { playerId: PlayerId; role: 'player' }
  ) & {
    sessionId: SessionId
  }
