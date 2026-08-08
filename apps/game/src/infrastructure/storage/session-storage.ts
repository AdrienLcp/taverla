import type { ConnectionRole } from '@blindtest/protocol/client-message'
import type { RoomCode, SessionId } from '@blindtest/protocol/identifiers'

type SessionScope = {
  role: ConnectionRole
  roomCode: RoomCode
}

/**
 * Scoped by room *and* role. Room, because a session id is a claim on one seat.
 * Role, because hosting and playing the same room from one browser is a normal
 * way to try the game out, and a shared key would have the two tabs claiming
 * each other's identity.
 */
const keyFor = ({ role, roomCode }: SessionScope): string =>
  `blindtest:session:${roomCode}:${role}`

/**
 * The session id is minted by the client, not the server, and that is
 * load-bearing rather than stylistic: React's StrictMode opens a socket, tears
 * it down and opens another, and the server can still be holding the first when
 * the second says hello. A client-supplied id makes the second connection a
 * *reclaim* of the same seat instead of a stranger fighting for it — the same
 * path a phone takes when it reconnects after a screen lock.
 *
 * Every access is guarded: `localStorage` throws outright in a Safari private
 * window. The degradation is losing the ability to reclaim a seat, which beats
 * a blank page.
 */
export const ensureSessionId = (scope: SessionScope): SessionId => {
  const stored = read(scope)

  if (stored !== null) {
    return stored
  }

  const created = crypto.randomUUID()

  write(scope, created)

  return created
}

const read = (scope: SessionScope): SessionId | null => {
  try {
    return localStorage.getItem(keyFor(scope))
  } catch {
    return null
  }
}

const write = (scope: SessionScope, sessionId: SessionId): void => {
  try {
    localStorage.setItem(keyFor(scope), sessionId)
  } catch {
    return
  }
}
