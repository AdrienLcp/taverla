/**
 * Bumped whenever a message shape changes in a way an older peer cannot read.
 * Both sides ship from this repository, so the only realistic mismatch is a
 * browser tab left open across a redeploy — `hello` carries the client's
 * version and the server closes the socket rather than letting a stale tab
 * desynchronise a live game.
 */
export const PROTOCOL_VERSION = 11
