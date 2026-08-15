import { z } from 'zod'

export const protocolErrorCodes = [
  'room_not_found',
  'room_full',
  'room_closed',
  'nickname_taken',
  'invalid_message',
  'protocol_version_mismatch',
  'host_already_connected',
  /**
   * A second console arriving in the seconds after the first one's socket died.
   * Its own code rather than `host_already_connected`, because nobody is
   * connected and the two ask for different things: one says the room is taken,
   * this one says waiting will do — a lid closing and a Wi-Fi blink both land
   * here, and the room is handed over anyway once the window runs out.
   */
  'host_reconnecting',
  'host_only_action',
  'wrong_phase',
  'stale_round',
  'already_buzzed',
  'player_locked_out',
  /**
   * A frame from a phone that took its seat after the round was under way. It
   * keeps the seat and plays from the next round; the screen is what stops it
   * acting in this one, and this is the backstop behind that — a socket is
   * whatever its owner makes it.
   */
  'joined_mid_round',
  /**
   * A round was asked for in a room whose game nobody has picked yet. Its own
   * code rather than `wrong_phase`, because the phase is right — the lobby is
   * exactly where this happens — and what is missing is a decision the host can
   * make on the screen they are looking at.
   */
  'no_game_chosen',
  /**
   * A lie that turned out to be the answer. Refused rather than accepted,
   * because the truth appearing twice on the board is a vote with no right
   * answer — and the player has to be told why, or "rejected" reads as a bug in
   * a game whose whole input is a free-text field.
   */
  'lie_is_the_answer',
  /** Voting for your own lie, which is the one line on the board nobody may pick. */
  'cannot_vote_for_own_lie',
  'no_content_available',
  'music_source_unavailable',
  'rate_limited',
  'internal_error'
] as const

export const protocolErrorCodeSchema = z.enum(protocolErrorCodes)

export type ProtocolErrorCode = z.infer<typeof protocolErrorCodeSchema>
