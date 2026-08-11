import { z } from 'zod'

export const protocolErrorCodes = [
  'room_not_found',
  'room_full',
  'room_closed',
  'nickname_taken',
  'invalid_message',
  'protocol_version_mismatch',
  'host_already_connected',
  'host_only_action',
  'wrong_phase',
  'stale_round',
  'already_buzzed',
  'player_locked_out',
  /**
   * A round was asked for in a room whose game nobody has picked yet. Its own
   * code rather than `wrong_phase`, because the phase is right — the lobby is
   * exactly where this happens — and what is missing is a decision the host can
   * make on the screen they are looking at.
   */
  'no_game_chosen',
  'no_content_available',
  'music_source_unavailable',
  'rate_limited',
  /**
   * A message the contract already describes but the server does not serve yet.
   * It exists so a half-built stage answers honestly instead of borrowing a
   * code that means something else; it should disappear as the stages land.
   */
  'not_implemented',
  'internal_error'
] as const

export const protocolErrorCodeSchema = z.enum(protocolErrorCodes)

export type ProtocolErrorCode = z.infer<typeof protocolErrorCodeSchema>
