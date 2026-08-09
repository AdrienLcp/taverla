import type { ConnectionRole } from '@taverla/protocol/client-message'
import type { RoomCode, SessionId } from '@taverla/protocol/identifiers'

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
  `taverla:session:${roomCode}:${role}`

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

  const created = mintSessionId()

  write(scope, created)

  return created
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
