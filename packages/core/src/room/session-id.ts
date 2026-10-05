import { nanoid } from 'nanoid'

import type { SessionId } from '@taverla/protocol/identifiers'

const SESSION_ID_LENGTH = 16

/**
 * Minted by the browser that remembers a seat and by the server for a socket
 * that arrives without one, so both draw it here at the same length.
 *
 * `nanoid` rather than `crypto.randomUUID`, which exists only in a secure
 * context: a room tried on real phones over plain HTTP on a LAN address is not
 * one, while `crypto.getRandomValues` is there in every context.
 */
export const newSessionId = (): SessionId => nanoid(SESSION_ID_LENGTH)
